# app/routes/route.py
from flask import Blueprint, jsonify

main = Blueprint("main", __name__)

@main.route("/")
def home():
    return jsonify({"message": "Hello from Flask backend edited test!"})
