// Parent ID Cache for TRENDLOG_DATA split-table optimization
// Caches parent_id lookups to avoid repeated database queries
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use sea_orm::*;
use crate::entity::t3_device::trendlog_data;
use crate::error::AppError;
use crate::logger::{write_structured_log_with_level, LogLevel};

#[derive(Hash, Eq, PartialEq, Clone, Debug)]
pub struct ParentKey {
    pub serial_number: i32,
    pub panel_id: i32,
    pub point_id: String,
    pub point_index: i32,
    pub point_type: String,
}

pub struct TrendlogParentCache {
    cache: Arc<RwLock<HashMap<ParentKey, i32>>>,
    max_size: usize,
}

impl TrendlogParentCache {
    pub fn new(max_size: usize) -> Self {
        Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
            max_size,
        }
    }

    /// Get parent_id from cache, or fetch/create from database
    pub async fn get_or_create_parent<C>(
        &self,
        db: &C,
        key: ParentKey,
        digital_analog: Option<String>,
        range_field: Option<String>,
        units: Option<String>,
    ) -> Result<i32, AppError>
    where
        C: ConnectionTrait,
    {
        // Check cache first (read lock)
        {
            let cache = self.cache.read().map_err(|_| {
                AppError::InternalError("Cache lock poisoned".to_string())
            })?;

            if let Some(&parent_id) = cache.get(&key) {
                return Ok(parent_id);
            }
        }

        // Not in cache - lookup or create in DB
        let parent_id = self.fetch_or_create_parent(db, &key, digital_analog, range_field, units).await?;

        // Store in cache (write lock)
        {
            let mut cache = self.cache.write().map_err(|_| {
                AppError::InternalError("Cache lock poisoned".to_string())
            })?;

            // Simple eviction: if cache is full, clear it (LRU would be better but adds complexity)
            if cache.len() >= self.max_size {
                cache.clear();
            }

            cache.insert(key, parent_id);
        }

        Ok(parent_id)
    }

    /// Batch get or create multiple parents (more efficient for bulk inserts)
    pub async fn batch_get_or_create_parents<C>(
        &self,
        db: &C,
        keys: Vec<(ParentKey, Option<String>, Option<String>, Option<String>)>,
    ) -> Result<Vec<i32>, AppError>
    where
        C: ConnectionTrait,
    {
        if keys.is_empty() {
            return Ok(Vec::new());
        }

        let mut parent_ids = Vec::with_capacity(keys.len());
        let mut cache_hits = 0;
        let mut cache_misses = 0;
        let mut keys_to_fetch = Vec::new();
        let mut fetch_indices = Vec::new();

        // OPTIMIZATION 1: Check cache first for all keys (fast)
        for (idx, (key, digital_analog, range_field, units)) in keys.iter().enumerate() {
            let cached_id = self.cache.read().ok().and_then(|cache| cache.get(key).copied());
            if let Some(id) = cached_id {
                parent_ids.push((idx, id));
                cache_hits += 1;
            } else {
                keys_to_fetch.push((key.clone(), digital_analog.clone(), range_field.clone(), units.clone()));
                fetch_indices.push(idx);
                cache_misses += 1;
            }
        }

        // OPTIMIZATION 2: Batch fetch all missing keys from database in ONE query
        if !keys_to_fetch.is_empty() {
            use sea_orm::QueryFilter;

            // Build OR conditions for all missing keys
            let mut condition = sea_orm::Condition::any();
            for (key, _, _, _) in &keys_to_fetch {
                condition = condition.add(
                    sea_orm::Condition::all()
                        .add(trendlog_data::Column::SerialNumber.eq(key.serial_number))
                        .add(trendlog_data::Column::PanelId.eq(key.panel_id))
                        .add(trendlog_data::Column::PointId.eq(&key.point_id))
                        .add(trendlog_data::Column::PointIndex.eq(key.point_index))
                        .add(trendlog_data::Column::PointType.eq(&key.point_type))
                );
            }

            // Single query to fetch all existing parents
            let existing_parents = trendlog_data::Entity::find()
                .filter(condition)
                .all(db)
                .await?;

            // Build lookup map
            use std::collections::HashMap;
            let existing_map: HashMap<ParentKey, i32> = existing_parents.into_iter()
                .map(|p| {
                    let key = ParentKey {
                        serial_number: p.serial_number,
                        panel_id: p.panel_id,
                        point_id: p.point_id.clone(),
                        point_index: p.point_index,
                        point_type: p.point_type.clone(),
                    };
                    (key, p.id)
                })
                .collect();

            // Process results: use existing or create new
            let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
            let mut new_parents_to_insert = Vec::new();

            for (idx_in_fetch, (key, digital_analog, range_field, units)) in keys_to_fetch.iter().enumerate() {
                if let Some(&parent_id) = existing_map.get(key) {
                    // Found in database
                    parent_ids.push((fetch_indices[idx_in_fetch], parent_id));

                    // Cache it for future use
                    if let Ok(mut cache) = self.cache.write() {
                        cache.insert(key.clone(), parent_id);
                    }
                } else {
                    // Need to create new parent
                    new_parents_to_insert.push((
                        fetch_indices[idx_in_fetch],
                        key.clone(),
                        digital_analog.clone(),
                        range_field.clone(),
                        units.clone(),
                        now.clone()
                    ));
                }
            }

            // OPTIMIZATION 3: Batch insert new parents if any
            if !new_parents_to_insert.is_empty() {
                let new_active_models: Vec<trendlog_data::ActiveModel> = new_parents_to_insert.iter()
                    .map(|(_, key, digital_analog, range_field, units, now)| {
                        trendlog_data::ActiveModel {
                            serial_number: Set(key.serial_number),
                            panel_id: Set(key.panel_id),
                            point_id: Set(key.point_id.clone()),
                            point_index: Set(key.point_index),
                            point_type: Set(key.point_type.clone()),
                            digital_analog: Set(digital_analog.clone()),
                            range_field: Set(range_field.clone()),
                            units: Set(units.clone()),
                            description: Set(None),
                            is_active: Set(Some(true)),
                            created_at: Set(Some(now.clone())),
                            updated_at: Set(Some(now.clone())),
                            ..Default::default()
                        }
                    })
                    .collect();

                let insert_result = trendlog_data::Entity::insert_many(new_active_models)
                    .exec(db)
                    .await?;

                // Get the IDs of newly inserted parents (sequential from last_insert_id)
                let first_id = insert_result.last_insert_id;
                for (idx, (original_idx, key, _, _, _, _)) in new_parents_to_insert.iter().enumerate() {
                    let parent_id = first_id + idx as i32;
                    parent_ids.push((*original_idx, parent_id));

                    // Cache new parent
                    if let Ok(mut cache) = self.cache.write() {
                        cache.insert(key.clone(), parent_id);
                    }
                }
            }
        }

        // Sort by original index and extract IDs
        parent_ids.sort_by_key(|(idx, _)| *idx);
        let result: Vec<i32> = parent_ids.into_iter().map(|(_, id)| id).collect();

        // Log batch statistics
        if cache_misses > 0 || cache_hits > 0 {
            let _ = write_structured_log_with_level(
                "T3_Webview_API",
                &format!(
                    "📊 [ParentCache] Batch processed {} keys - Cache hits: {}, Database lookups: {}",
                    keys.len(), cache_hits, cache_misses
                ),
                LogLevel::Info
            );
        }

        Ok(result)
    }

    /// Fetch parent from database or create if not exists
    async fn fetch_or_create_parent<C>(
        &self,
        db: &C,
        key: &ParentKey,
        digital_analog: Option<String>,
        range_field: Option<String>,
        units: Option<String>,
    ) -> Result<i32, AppError>
    where
        C: ConnectionTrait,
    {
        // Try to find existing parent
        let existing = trendlog_data::Entity::find()
            .filter(trendlog_data::Column::SerialNumber.eq(key.serial_number))
            .filter(trendlog_data::Column::PanelId.eq(key.panel_id))
            .filter(trendlog_data::Column::PointId.eq(&key.point_id))
            .filter(trendlog_data::Column::PointIndex.eq(key.point_index))
            .filter(trendlog_data::Column::PointType.eq(&key.point_type))
            .one(db)
            .await?;

        if let Some(parent) = existing {
            return Ok(parent.id);
        }

        // Create new parent - use Local time instead of UTC
        let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let new_parent = trendlog_data::ActiveModel {
            serial_number: Set(key.serial_number),
            panel_id: Set(key.panel_id),
            point_id: Set(key.point_id.clone()),
            point_index: Set(key.point_index),
            point_type: Set(key.point_type.clone()),
            digital_analog: Set(digital_analog),
            range_field: Set(range_field),
            units: Set(units),
            description: Set(None),
            is_active: Set(Some(true)),
            created_at: Set(Some(now.clone())),
            updated_at: Set(Some(now)),
            ..Default::default()
        };

        let result = new_parent.insert(db).await?;
        Ok(result.id)
    }

    /// Clear the entire cache (useful for testing or after bulk operations)
    pub fn clear(&self) -> Result<(), AppError> {
        let mut cache = self.cache.write().map_err(|_| {
            AppError::InternalError("Cache lock poisoned".to_string())
        })?;
        cache.clear();
        Ok(())
    }

    /// Get current cache size
    pub fn size(&self) -> Result<usize, AppError> {
        let cache = self.cache.read().map_err(|_| {
            AppError::InternalError("Cache lock poisoned".to_string())
        })?;
        Ok(cache.len())
    }
}

impl Default for TrendlogParentCache {
    fn default() -> Self {
        Self::new(1000) // Default cache size: 1000 entries
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parent_key_equality() {
        let key1 = ParentKey {
            serial_number: 237219,
            panel_id: 1,
            point_id: "IN1".to_string(),
            point_index: 1,
            point_type: "INPUT".to_string(),
        };

        let key2 = ParentKey {
            serial_number: 237219,
            panel_id: 1,
            point_id: "IN1".to_string(),
            point_index: 1,
            point_type: "INPUT".to_string(),
        };

        assert_eq!(key1, key2);
    }

    #[test]
    fn test_cache_creation() {
        let cache = TrendlogParentCache::new(500);
        assert_eq!(cache.size().unwrap(), 0);
    }
}
