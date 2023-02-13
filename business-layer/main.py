from flask import Flask, send_file, request, abort
from flask_restful import Resource, Api
import requests as r
import math
from PIL import Image
from io import BytesIO

DATA_LAYER_URL = 'http://data-layers/api'

def serve_pil_image(pil_img):
    img_io = BytesIO()
    pil_img.save(img_io, 'PNG')
    img_io.seek(0)
    return send_file(img_io, mimetype='image/png')

def get_coordinates(location):
    parameters = {
        'address': location
    }

    res = r.get(f"{DATA_LAYER_URL}/adapters/v1/geocoding/search", params=parameters)

    # If the geocoding service returns an error, return the error
    if res.status_code != 200:
        abort(404, res.json())

    return res.json()

def deg2num(lat_deg, lon_deg, zoom):
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = (lon_deg + 180.0) / 360.0 * n
    ytile = (1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n
    return (xtile, ytile)

app = Flask(__name__)
api = Api(app)
    
class MapOverlay(Resource):

    def __init__(self) -> None:
        super().__init__()

        self.map_size = 256
        self.icon_size = 80
        self.zoom = 12

    def get(self):

        args = request.args

        coordinates = {
            "lat": args.get("lat"),
            "lon": args.get("lon"),
        }

        if args.get('location'):
            coordinates = get_coordinates(args.get('location'))

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

                parameters = {
                    'x': x_tile + i + x_tile_offset,
                    'y': y_tile + j + y_tile_offset,
                    'zoom': self.zoom
                }

                res = r.get(f"{DATA_LAYER_URL}/adapters/v1/map", params=parameters)
                map_image = Image.open(BytesIO(res.content))
                res = r.get(f"{DATA_LAYER_URL}/adapters/v1/map/precipitations", params=parameters)
                precipitation_overlay = Image.open(BytesIO(res.content))

                # paste precipitation overlay on map
                map_image.paste(precipitation_overlay, (0, 0), precipitation_overlay)

                base_canvas.paste(map_image, (i * self.map_size, j * self.map_size))

        # get weather icon
        res = r.get(f"{DATA_LAYER_URL}/adapters/v1/weather/current", params=parameters)
        icon_url = "https://" + res.json()['current']['condition']['icon'][2:]
        weather_icon = Image.open(BytesIO(r.get(icon_url).content))
        weather_icon = weather_icon.resize((self.icon_size, self.icon_size))

        # calculate offset of weather icon
        offset = (
            (abs(x_tile_offset) * self.map_size) + int(x_location * self.map_size) - self.icon_size // 2,
            (abs(y_tile_offset) * self.map_size) + int(y_location * self.map_size) - self.icon_size // 2
        )

        # # overlay precipitation on map
        # map_image.paste(precipitation_overlay, (0, 0), precipitation_overlay)
        base_canvas.paste(weather_icon, offset, weather_icon)

        return serve_pil_image(base_canvas)
 
class WeatherInfo(Resource):

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

        coordinates = {
            "lat": args.get("lat"),
            "lon": args.get("lon"),
        }

        if args.get('location'):
            coordinates = get_coordinates(args.get('location'))

        parameters = {
            'lat': coordinates["lat"],
            'lon': coordinates["lon"],
        }

        weather_info = {}

        res = r.get(f"{DATA_LAYER_URL}/adapters/v1/weather/current", params=parameters)
        weather_info["temperature"] = f"{res.json()['current']['temp_c']}°C"
        weather_info["humidity"] = f"{res.json()['current']['humidity']}%"
        weather_info["precipitation"] = f"{res.json()['current']['precip_mm']}mm"
        weather_info["weather_condition"] = f"{res.json()['current']['condition']['text']}"
        
        res = r.get(f"{DATA_LAYER_URL}/air_pollution", params=parameters)

        weather_info["air_quality"] = self.air_quality[res.json()['main']['aqi']]


        return weather_info
    
class RecommendedPlaces(Resource):

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

        coordinates = {
            "lat": args.get("lat"),
            "lon": args.get("lon"),
        }

        if args.get('location'):
            coordinates = get_coordinates(args.get('location'))

        parameters = {
            'lat': coordinates["lat"],
            'lon': coordinates["lon"],
            'categories': self.categories[args.get('category')],
        }

        res = r.get(f"{DATA_LAYER_URL}/adapters/v1/places", params=parameters)

        to_return = [{
            "name": place["properties"].get("name") or place["properties"].get("address_line1"),
            "lat": place["properties"]["lat"],
            "lon": place["properties"]["lon"],
        } for place in res.json()]

        return to_return
    
class User(Resource):
    def get(self, user_id):

        # Check if user exists
        res = r.get(f"{DATA_LAYER_URL}/db/v1/user/{user_id}")

        # If user does not exist, create it
        if res.status_code == 404:
            res = r.post(f"{DATA_LAYER_URL}/db/v1/user/{user_id}")

        # Return user info
        return {
            "lon": res.json()["lon"],
            "lat": res.json()["lat"],
        }
    
    def patch(self, user_id):
            
            args = request.get_json()
    
            coordinates = {
                "lat": args.get("lat"),
                "lon": args.get("lon"),
            }
    
            if args.get('location'):
                coordinates = get_coordinates(args.get('location'))
    
            parameters = {
                'lat': coordinates["lat"],
                'lon': coordinates["lon"],
            }
    
            res = r.patch(f"{DATA_LAYER_URL}/db/v1/user/{user_id}", data=parameters)
    
            return {
                "lon": res.json()["lon"],
                "lat": res.json()["lat"],
            }

api.add_resource(MapOverlay, '/map')
api.add_resource(WeatherInfo, '/weather')
api.add_resource(RecommendedPlaces, '/places')
api.add_resource(User, '/user/<string:user_id>')


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=80)