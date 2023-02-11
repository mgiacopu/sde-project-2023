from flask import Flask, send_file, request, abort
from flask_restful import Resource, Api
import requests as r
from PIL import Image
from io import BytesIO

DATA_LAYER_URL = 'http://data-layers/v1'

def serve_pil_image(pil_img):
    img_io = BytesIO()
    pil_img.save(img_io, 'PNG')
    img_io.seek(0)
    return send_file(img_io, mimetype='image/png')

def get_coordinates(location):
    parameters = {
        'address': location
    }

    res = r.get(f"{DATA_LAYER_URL}/geocoding/search", params=parameters)

    # If the geocoding service returns an error, return the error
    if res.status_code != 200:
        abort(404, res.json())

    return res.json()

app = Flask(__name__)
api = Api(app)

class HelloWorld(Resource):
    def get(self):
        return {'hello': 'world'}
    
class MapOverlay(Resource):
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

        # get map image
        res = r.get(f"{DATA_LAYER_URL}/map", params=parameters)
        map_image = Image.open(BytesIO(res.content))

        # get precipitation overlay
        res = r.get(f"{DATA_LAYER_URL}/map/precipitations", params=parameters)
        precipitation_overlay = Image.open(BytesIO(res.content))

        # increase cintrast of precipitation overlay
        precipitation_overlay = precipitation_overlay.point(lambda p: p * 1.5)
        

        # overlay precipitation on map
        map_image.paste(precipitation_overlay, (0, 0), precipitation_overlay)

        return serve_pil_image(map_image)

class WeatherInfo(Resource):
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

        res = r.get(f"{DATA_LAYER_URL}/weather/current", params=parameters)
        weather_info["temperature"] = f"{res.json()['current']['temp_c']}°C"
        weather_info["humidity"] = f"{res.json()['current']['humidity']}%"
        weather_info["precipitation"] = f"{res.json()['current']['precip_mm']}mm"
        weather_info["weather_condition"] = f"{res.json()['current']['condition']['text']}"
        
        res = r.get(f"{DATA_LAYER_URL}/air_pollution", params=parameters)

        aq = {
            1: "Good",
            2: "Fair",
            3: "Moderate",
            4: "Poor",
            5: "Very Poor",
        }

        weather_info["air_quality"] = aq[res.json()['list'][0]['main']['aqi']]


        return weather_info
    
class RecommendedPlaces(Resource):
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

        res = r.get(f"{DATA_LAYER_URL}/places", params=parameters)

        return res.json()

api.add_resource(MapOverlay, '/map')
api.add_resource(WeatherInfo, '/weather')
api.add_resource(RecommendedPlaces, '/')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=80)