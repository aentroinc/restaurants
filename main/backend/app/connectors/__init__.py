"""Connector exports.

OAuth2 + API key 系の connector を 1箇所に集約。
"""
from app.connectors.oauth_square import SquareOAuth
from app.connectors.oauth_smaregi import SmaregiOAuth
from app.connectors.oauth_airregi import AirregiAPIKey
from app.connectors.oauth_kot import KOTAPIKey
from app.connectors.kot_attendance import KOTAttendance
from app.connectors.freee_accounting import FreeeAccounting
from app.connectors.ubereats import UberEatsMerchant
from app.connectors.td_temperature import TDTemperature

__all__ = [
    "SquareOAuth",
    "SmaregiOAuth",
    "AirregiAPIKey",
    "KOTAPIKey",
    "KOTAttendance",
    "FreeeAccounting",
    "UberEatsMerchant",
    "TDTemperature",
]
