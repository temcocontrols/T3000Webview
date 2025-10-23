// Parent ID Cache for TRENDLOG_DATA split-table optimization
// Caches parent_id lookups to avoid repeated database queries
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use sea_orm::*;
use crate::entity::t3_device::trendlog_data;
use crate::error::AppError;

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
        let mut parent_ids = Vec::with_capacity(keys.len());

        for (key, digital_analog, range_field, units) in keys {
            let parent_id = self.get_or_create_parent(db, key, digital_analog, range_field, units).await?;
            parent_ids.push(parent_id);
        }

        Ok(parent_ids)
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

        // Create new parent
        let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
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
