from app import db
from datetime import datetime
import json

class SystemSettings(db.Model):
    __tablename__ = 'system_settings'
    
    setting_id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), nullable=False)  # 'general', 'elections', 'security', etc.
    setting_key = db.Column(db.String(100), nullable=False)
    setting_value = db.Column(db.Text, nullable=False)  # JSON string
    data_type = db.Column(db.String(20), nullable=False)  # 'string', 'number', 'boolean', 'object'
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Add unique constraint on category + setting_key
    __table_args__ = (db.UniqueConstraint('category', 'setting_key', name='unique_category_setting'),)
    
    def __repr__(self):
        return f'<SystemSettings {self.category}.{self.setting_key}>'
    
    def to_dict(self):
        """Convert setting to dictionary format"""
        return {
            'setting_id': self.setting_id,
            'category': self.category,
            'setting_key': self.setting_key,
            'setting_value': self.get_typed_value(),
            'data_type': self.data_type,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def get_typed_value(self):
        """Get the value converted to the appropriate Python type"""
        try:
            if self.data_type == 'boolean':
                return self.setting_value.lower() in ['true', '1', 'yes']
            elif self.data_type == 'number':
                # Try int first, then float
                try:
                    return int(self.setting_value)
                except ValueError:
                    return float(self.setting_value)
            elif self.data_type == 'object':
                return json.loads(self.setting_value)
            else:  # string
                return self.setting_value
        except (ValueError, json.JSONDecodeError):
            return self.setting_value
    
    def set_typed_value(self, value):
        """Set the value with automatic type detection and conversion"""
        if isinstance(value, bool):
            self.data_type = 'boolean'
            self.setting_value = str(value).lower()
        elif isinstance(value, int):
            self.data_type = 'number'
            self.setting_value = str(value)
        elif isinstance(value, float):
            self.data_type = 'number'
            self.setting_value = str(value)
        elif isinstance(value, (dict, list)):
            self.data_type = 'object'
            self.setting_value = json.dumps(value)
        else:
            self.data_type = 'string'
            self.setting_value = str(value)
    
    @classmethod
    def get_setting(cls, category, setting_key, default=None):
        """Get a specific setting value"""
        setting = cls.query.filter_by(category=category, setting_key=setting_key).first()
        if setting:
            return setting.get_typed_value()
        return default
    
    @classmethod
    def set_setting(cls, category, setting_key, value, description=None):
        """Set a specific setting value"""
        setting = cls.query.filter_by(category=category, setting_key=setting_key).first()
        if setting:
            setting.set_typed_value(value)
            setting.updated_at = datetime.utcnow()
            if description:
                setting.description = description
        else:
            setting = cls(category=category, setting_key=setting_key, description=description)
            setting.set_typed_value(value)
            db.session.add(setting)
        
        db.session.commit()
        return setting
    
    @classmethod
    def get_category_settings(cls, category):
        """Get all settings for a specific category as a dictionary"""
        settings = cls.query.filter_by(category=category).all()
        return {setting.setting_key: setting.get_typed_value() for setting in settings}
    
    @classmethod
    def get_all_settings(cls):
        """Get all settings organized by category"""
        settings = cls.query.all()
        result = {}
        for setting in settings:
            if setting.category not in result:
                result[setting.category] = {}
            result[setting.category][setting.setting_key] = setting.get_typed_value()
        return result
    
    @classmethod
    def bulk_update_category(cls, category, settings_dict):
        """Update multiple settings in a category at once"""
        for setting_key, value in settings_dict.items():
            cls.set_setting(category, setting_key, value)
        return True
