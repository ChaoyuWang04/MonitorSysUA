"""
应用配置管理
使用Pydantic Settings从环境变量加载配置
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """应用配置"""

    # 数据库配置
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/monitorua"

    # Google Ads API配置（路径相对于项目根目录）
    GOOGLE_ADS_CONFIG_PATH: str = "googletest/google-ads.yaml"
    GOOGLE_ADS_CUSTOMER_ID: str = "2766411035"

    # API配置
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_RELOAD: bool = True
    API_TITLE: str = "MonitorSysUA API"
    API_VERSION: str = "0.1.0"

    # CORS配置
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # 定时任务配置
    SYNC_INTERVAL_MINUTES: int = 10

    # 日志配置
    LOG_LEVEL: str = "INFO"

    class Config:
        # 从项目根目录读取.env文件（backend/的父目录）
        import os
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        case_sensitive = True


# 全局配置实例
settings = Settings()
