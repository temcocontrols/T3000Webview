pub mod devices;
pub mod trend_points;
pub mod trend_data;
pub mod timebase_config;
pub mod collection_status;

// Export specific types with prefixes to avoid conflicts
pub use devices::{Entity as TrendlogDeviceEntity, Model as TrendlogDeviceModel, ActiveModel as TrendlogDeviceActiveModel, Column as TrendlogDeviceColumn};
pub use trend_points::{Entity as TrendPointEntity, Model as TrendPointModel, ActiveModel as TrendPointActiveModel, Column as TrendPointColumn};
pub use trend_data::{Entity as TrendDataEntity, Model as TrendDataModel, ActiveModel as TrendDataActiveModel, Column as TrendDataColumn};
pub use timebase_config::{Entity as TimebaseConfigEntity, Model as TimebaseConfigModel, ActiveModel as TimebaseConfigActiveModel, Column as TimebaseConfigColumn};
pub use collection_status::{Entity as CollectionStatusEntity, Model as CollectionStatusModel, ActiveModel as CollectionStatusActiveModel, Column as CollectionStatusColumn};

// Export enums
pub use devices::{DeviceType};
pub use trend_points::{PointType, DataType};
pub use trend_data::{DataQuality};
pub use collection_status::{CollectionStatusType};
