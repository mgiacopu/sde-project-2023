from flask import Flask, send_file, request, abort
from flask_restful import Resource, Api
from flask_swagger_ui import get_swaggerui_blueprint
from datetime import datetime, date, timedelta
import requests as r
import math
from PIL import Image
from io import BytesIO

# Configuration and constants
DATA_LAYER_URL = 'http://data-layers/api'
LAYER_ADAPTER_URL = f'{DATA_LAYER_URL}/adapters/v1'
LAYER_DATABASE_URL = f'{DATA_LAYER_URL}/db/v1'

SWAGGER_URL = '/api/docs'
OPENAPI_FILE = '/static/openapi.yaml'
SWAGGER_CONFIG ={  
        'app_name': "Business Layer APIs"
    }

def serve_pil_image(pil_img):
    """Converts the PIL image to a Flask response"""
    img_io = BytesIO()
    pil_img.save(img_io, 'PNG')
    img_io.seek(0)
    return send_file(img_io, mimetype='image/png')

def get_coordinates(location):
    """Get coordinates from location using the geocoding service"""
    parameters = {
        'address': location
    }

    res = r.get(f"{LAYER_ADAPTER_URL}/geocoding/search", params=parameters)

    # If the geocoding service returns an error, return the error
    if res.status_code != 200:
        abort(404, res.json())

    return res.json()

def verify_location(args):
    """Verifies the location and returns the coordinates"""
    coordinates = {
        "lat": args.get("lat"),
        "lon": args.get("lon"),
    }

    if not args.get('lat') or not args.get('lon'):
        if not args.get('location'):
            abort(400, "Coordinates or location not specified")
        else:
            coordinates = get_coordinates(args.get('location'))

    return coordinates

def deg2num(lat_deg, lon_deg, zoom):
    """Converts coordinates to tile coordinates"""
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = (lon_deg + 180.0) / 360.0 * n
    ytile = (1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n
    return (xtile, ytile)

# Flask configuration
app = Flask(__name__)
app.register_blueprint(get_swaggerui_blueprint(SWAGGER_URL, OPENAPI_FILE, SWAGGER_CONFIG))
api = Api(app, prefix="/api/v1")
    
class MapOverlay(Resource):
    """Returns a map overlay with the weather icon and precipitation overlay"""

    def __init__(self) -> None:
        super().__init__()

        self.map_size = 256
        self.icon_size = 80
        self.zoom = 12

    def get(self):

        args = request.args
        
        coordinates = verify_location(args)

        parameters = {
            'lat': coordinates["lat"],
            'lon': coordinates["lon"],
        }

        # get the coordinates of the location in the tile
        x, y = deg2num(float(coordinates["lat"]), float(coordinates["lon"]), self.zoom)
        x_tile = math.floor(x)
        y_tile = math.floor(y)
        x_location = x - x_tile
        y_location = y - y_tile
        x_tile_offset = 0
        y_tile_offset = 0

        if x_location < 0.5:
            x_tile_offset -= 1
        
        if y_location < 0.5:
            y_tile_offset -= 1

        base_canvas = Image.new('RGBA', (self.map_size * 2, self.map_size * 2), (0, 0, 0, 0))

        # get the map tiles
        for i in range(2):
            for j in range(2):

                parameters_tiles = {
                    'x': x_tile + i + x_tile_offset,
                    'y': y_tile + j + y_tile_offset,
                    'zoom': self.zoom
                }

                res = r.get(f"{LAYER_ADAPTER_URL}/map", params=parameters_tiles)
                map_image = Image.open(BytesIO(res.content))
                
                if ((not args.get("today") and not args.get("delta")) 
                    or (date.today() == datetime.strptime(args.get("today"), "%Y-%m-%d").date() + timedelta(int(args.get("delta"))))):
                    res = r.get(f"{LAYER_ADAPTER_URL}/map/precipitations", params=parameters_tiles)
                    precipitation_overlay = Image.open(BytesIO(res.content))

                    # paste precipitation overlay on map
                    map_image.paste(precipitation_overlay, (0, 0), precipitation_overlay)

                base_canvas.paste(map_image, (i * self.map_size, j * self.map_size))

        # get weather icon
        if not args.get('today'):
            res = r.get(f"{LAYER_ADAPTER_URL}/weather/current", params=parameters)
            icon_url = "https://" + res.json()['current']['condition']['icon'][2:]
        else:
            parameters["day"] = args.get('today')
            res = r.get(f"{LAYER_ADAPTER_URL}/weather/forecast", params=parameters)
            icon_url = "https://" + res.json()[parameters["day"]]['condition']['icon'][2:]

        weather_icon = Image.open(BytesIO(r.get(icon_url).content))
        weather_icon = weather_icon.resize((self.icon_size, self.icon_size))

        # calculate offset of weather icon
        offset = (
            (abs(x_tile_offset) * self.map_size) + int(x_location * self.map_size) - self.icon_size // 2,
            (abs(y_tile_offset) * self.map_size) + int(y_location * self.map_size) - self.icon_size // 2
        )

        base_canvas.paste(weather_icon, offset, weather_icon)

        return serve_pil_image(base_canvas)

class WeatherInfo(Resource):
    """Returns the weather information for the specified location"""

    def __init__(self) -> None:
        super().__init__()

        self.air_quality = {
            1: "Good",
            2: "Fair",
            3: "Moderate",
            4: "Poor",
            5: "Very Poor",
        }

    def get(self):

        args = request.args
        
        coordinates = verify_location(args)

        parameters = {
            'lat': coordinates["lat"],
            'lon': coordinates["lon"],
        }

        date = {}
        info = {}

        if args.get('today') != None and args.get('delta') != None:
            date["today"] = datetime.strptime(args.get('today'), "%Y-%m-%d").date() + timedelta(days=int(args.get('delta')))
        else:
            date["today"] = date.today()
        
        date["yesterday"] = date["today"] - timedelta(days=1)
        date["tomorrow"] = date["today"] + timedelta(days=1)

        info["date"] = date["today"].strftime("%Y-%m-%d")
        
        # If the date is before current date, set to null. If the date is more than 3 days in the future, set to null.
        if date["yesterday"] < date.today():
            date["yesterday"] = None
        if date["tomorrow"] > date.today() + timedelta(days=3):
            date["tomorrow"] = None

        if date["today"] == date.today():
            res = r.get(f"{LAYER_ADAPTER_URL}/weather/current", params=parameters)
            cur_info = cur_info

            info["temperature"] = f"{cur_info['temp_c']}°C"
            info["humidity"] = f"{cur_info['humidity']}%"
            info["precipitation"] = f"{cur_info['precip_mm']}mm"
            info["weather_condition"] = f"{cur_info['condition']['text']}"
            
            res = r.get(f"{LAYER_ADAPTER_URL}/air_pollution", params=parameters)
            info["air_quality"] = self.air_quality[res.json()['main']['aqi']]
        else:
            parameters["day"] = date["today"].strftime("%Y-%m-%d")
            res = r.get(f"{LAYER_ADAPTER_URL}/weather/forecast", params=parameters)
            day_info = res.json()[parameters['day']]

            info["average_temperature"] = f"{day_info['avgtemp_c']}°C"
            info["average_humidity"] = f"{day_info['avghumidity']}%"
            info["chanche_of_precipitation"] = f"{day_info['daily_chance_of_rain']}%"
            info["weather_condition"] = f"{day_info['condition']['text']}"
            
            res = r.get(f"{LAYER_ADAPTER_URL}/air_pollution/forecast", params=parameters)
            aqi_hour = list(map(lambda x: x['main']['aqi'], res.json()))
            aqi_mean = sum(aqi_hour) / len(aqi_hour)
            info["air_quality"] = self.air_quality[round(aqi_mean)]

        
        # convert dates to string
        for day in date:
            if date[day] is not None:
                date[day] = date[day].strftime("%Y-%m-%d")

        return {"info": info, "date": date}
    
class RecommendedPlaces(Resource):
    """Returns a list of recommended places for the specified location"""

    def __init__(self) -> None:
        super().__init__()

        self.categories = {
            "restaurants": "catering.restaurant",
            "parks": "leisure.park",
            "museums": "entertainment.museum",
            "sights": "tourism.sights",
        }

    def get(self):

        args = request.args

        if not args.get('category'):
            return abort(400, "Category not specified")
        
        coordinates = verify_location(args)
        
        parameters = {
            'lat': coordinates["lat"],
            'lon': coordinates["lon"],
            'categories': self.categories[args.get('category')],
        }

        res = r.get(f"{LAYER_ADAPTER_URL}/places", params=parameters)

        to_return = [{
            "name": place["properties"].get("name") or place["properties"].get("address_line1"),
            "lat": place["properties"]["lat"],
            "lon": place["properties"]["lon"],
        } for place in res.json()]

        return to_return
    
class User(Resource):
    """Manages the user favourite location"""

    def get(self, user_id):
        """Returns the user favourite location"""

        # Check if user exists
        res = r.get(f"{LAYER_DATABASE_URL}/user/{user_id}")

        # If user does not exist, create it
        if res.status_code == 404:
            res = r.post(f"{LAYER_DATABASE_URL}/user/{user_id}")

        # Return user info
        return {
            "lon": res.json()["lon"],
            "lat": res.json()["lat"],
        }
    
    def patch(self, user_id):
        """Updates the user favourite location"""
            
        args = request.get_json()

        coordinates = verify_location(args)
    
        parameters = {
            'lat': coordinates["lat"],
            'lon': coordinates["lon"],
        }

        res = r.patch(f"{LAYER_DATABASE_URL}/user/{user_id}", data=parameters)

        return {
            "lon": res.json()["lon"],
            "lat": res.json()["lat"],
        }

# Register resources
api.add_resource(MapOverlay, '/map')
api.add_resource(WeatherInfo, '/weather')
api.add_resource(RecommendedPlaces, '/places')
api.add_resource(User, '/user/<string:user_id>')


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=80)