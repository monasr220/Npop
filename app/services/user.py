from datetime import datetime,timedelta,timezone
import os
from typing import Annotated,Any,cast

from dotenv import load_dotenv
from fastapi.encoders import jsonable_encoder
