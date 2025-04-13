# app/config.py
import os

class Config:
    # DATABASE_URL: 
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Other configuration options can go here       