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

        res = r.get(f"{DATA_LAYER_URL}/weather/current", params=parameters)
        weather_info["temperature"] = f"{res.json()['current']['temp_c']}°C"
        weather_info["humidity"] = f"{res.json()['current']['humidity']}%"
        weather_info["precipitation"] = f"{res.json()['current']['precip_mm']}mm"
        weather_info["weather_condition"] = f"{res.json()['current']['condition']['text']}"
        
        res = r.get(f"{DATA_LAYER_URL}/air_pollution", params=parameters)

        weather_info["air_quality"] = self.air_quality[res.json()['list'][0]['main']['aqi']]


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

        res = r.get(f"{DATA_LAYER_URL}/places", params=parameters)

        to_return = [{
            "name": place["properties"].get("name") or place["properties"].get("address_line1"),
            "lat": place["properties"]["lat"],
            "lon": place["properties"]["lon"],
        } for place in res.json()['features']]

        return to_return
    
class User(Resource):
    def get(self, user_id):

        # Check if user exists
        res = r.get(f"{DATA_LAYER_URL}/db/user/{user_id}")

        # If user does not exist, create it
        if res.status_code == 400:
            res = r.post(f"{DATA_LAYER_URL}/db/user/{user_id}")

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
    
            res = r.patch(f"{DATA_LAYER_URL}/db/user/{user_id}", data=parameters)
    
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