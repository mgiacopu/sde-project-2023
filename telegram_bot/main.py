import os
from dotenv import load_dotenv
from typing import List, Tuple, Dict, Any, Callable
from time import sleep
import requests as r
from PIL import Image
from io import BytesIO

from telegram import (
    Bot,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    Update,
    MessageAutoDeleteTimerChanged,
)

from telegram.ext import (
    Updater,
    CommandHandler,
    MessageHandler,
    Filters,
    ConversationHandler,
    CallbackQueryHandler,
    CallbackContext,
)

BUSINESS_LAYER_URL = "business-layer"

# Load environment variables
load_dotenv()
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")

# Helper functions
def CQH(callback: Callable, pattern: str) -> CallbackQueryHandler:
    """Shorthand function for CallbackQueryHandler

    Args:
        callback (Callable): the desired callback function
        pattern (str): the string pattern to match

    Returns:
        CallbackQueryHandler: the actual handler
    """
    return CallbackQueryHandler(callback, pattern="^" + pattern + "$")

# States and constants
(
    START,
    SELECT_INPUT,
    WEATHER,
    FAV_LOCATION,
    SEARCH_LOCATION,
    PREVIOUS,
    NEXT,
    PLACES_RESTAURANTS,
    PLACES_PARKS,
    PLACES_SIGHTS,
    PLACES_MUSEUMS,
    PLACES,
) = map(chr, range(12))

class TelegramBot:

    def __init__(self) -> None:
        pass

    def run(self) -> None:
        updater = Updater(TELEGRAM_TOKEN, use_context=True)
        dispatcher = updater.dispatcher

        main_handler = ConversationHandler(
            entry_points=[CommandHandler("start", self.start)],
            states={
                SELECT_INPUT: [
                    CQH(self.retrieve_fav_location, FAV_LOCATION),
                    CQH(self.ask_for_location, SEARCH_LOCATION),
                ],
                SEARCH_LOCATION: [
                    MessageHandler((Filters.text | Filters.location), self.verify_location),
                    MessageHandler(~(Filters.text | Filters.location), self.wrong_location),
                ],
                WEATHER: [
                    CQH(self.places, PLACES_RESTAURANTS),
                    CQH(self.places, PLACES_PARKS),
                    CQH(self.places, PLACES_MUSEUMS),
                    CQH(self.places, PLACES_SIGHTS),
                ],
                PLACES: [
                ],
            },
            fallbacks=[CommandHandler("end", self.cancel)],
        )

        dispatcher.add_handler(main_handler)

        updater.start_polling()
    
    def start(self, update: Update, context: CallbackContext) -> int:
        """Starts the bot conversation and asks the user to select input method.

        Args:
            update (Update): telegram update object
            context (CallbackContext): telegram context object

        Returns:
            int: New state of the conversation
        """
        
        text = "Select your input method."

        buttons = [
            [
                InlineKeyboardButton(
                    text="\U0001F4CD Favourite Location",
                    callback_data=FAV_LOCATION,
                ),
            ],
                        [
                InlineKeyboardButton(
                    text="\U0001F50E Search new Location",
                    callback_data=SEARCH_LOCATION,
                ),
            ],
        ]

        keyboard = InlineKeyboardMarkup(buttons)

        update.message.reply_text(
            "SDE2023meteo - Telegram Bot\n\n"
        )
        update.message.reply_text(text=text, reply_markup=keyboard)

        return SELECT_INPUT

    def ask_for_location(self, update: Update, context: CallbackContext) -> int:
        
        text = "Send the name of a location you want to search or send your current position."
        
        update.callback_query.answer()
        update.callback_query.edit_message_text(text=text)

        return SEARCH_LOCATION
    
    def retrieve_fav_location(self, update: Update, context: CallbackContext) -> int:
        pass

    def verify_location(self, update: Update, context: CallbackContext) -> int:
        
        search_message = update.message.reply_text("I'm searching for the weather in the provided location...")

        # Get user input
        if update.message.location:
            location = update.message.location
            location = dict(lat=location.latitude, lon=location.longitude)
        else:
            location = dict(location=update.message.text)

        # Get weather data
        res_weather = r.get(f"http://{BUSINESS_LAYER_URL}/weather", params=location)

        # Get map image
        res_map = r.get(f"http://{BUSINESS_LAYER_URL}/map", params=location)

        if res_weather.status_code != 200 or res_map.status_code != 200:
            search_message.edit_text("I couldn't find the weather in the provided location location. Try again.")
            return SEARCH_LOCATION
        
        context.user_data["location"] = location
        print(context.user_data)
        
        map_image = BytesIO(res_map.content)
        weather_condition = res_weather.json()["weather_condition"]
        weather_data = "\n".join([f"{k.replace('_', ' ').capitalize()}: {v}" for k,v in res_weather.json().items()])

        is_sunny = weather_condition.lower() in ["sunny", "clear", "partly cloudy", "cloudy"]

        buttons = [
            [
                InlineKeyboardButton(
                    text="\U000025C0",
                    callback_data=PREVIOUS,
                ),
                InlineKeyboardButton(
                    text="\U000025B6",
                    callback_data=NEXT,
                ),
            ],
            [
                InlineKeyboardButton(
                    text="\U0001F374 Restaurants",
                    callback_data=PLACES_RESTAURANTS,
                ),
            ] if not is_sunny else [],
            [
                InlineKeyboardButton(
                    text="\U0001F333 Parks",
                    callback_data=PLACES_PARKS,
                ),
            ] if is_sunny else [],
            [
                InlineKeyboardButton(
                    text="\U00002728 Sights",
                    callback_data=PLACES_SIGHTS,
                ),                

            ] if is_sunny else [],
            [                
                InlineKeyboardButton(
                    text="\U0001F5FF Museums",
                    callback_data=PLACES_MUSEUMS,
                ),
            ] if not is_sunny else [],
        ]

        keyboard = InlineKeyboardMarkup(buttons)

        update.message.reply_photo(
            photo=map_image,
            caption=weather_data,
            reply_markup=keyboard,
        )

        return WEATHER

    def places(self, update: Update, context: CallbackContext) -> int:

        # define categories
        categories = {
            PLACES_RESTAURANTS: "restaurants",
            PLACES_PARKS: "parks",
            PLACES_MUSEUMS: "museums",
            PLACES_SIGHTS: "sights",
        }

        # Get context data
        parameters = {
            **context.user_data.get("location"),
            "category": categories[update.callback_query.data],
        }

        # Get places data
        res_places = r.get(f"http://{BUSINESS_LAYER_URL}/places", params=parameters)
        res_places = res_places.json()

        # define buttons with places to visit
        buttons = [
            [
                InlineKeyboardButton(
                    text=place["name"],
                    url=f"maps.google.com/maps?q={place['lat']}+{place['lon']}",
                ),
            ] for place in res_places
        ]

        keyboard = InlineKeyboardMarkup(buttons)

        update.callback_query.message.reply_text(
            text="Here are some places to visit:",
            reply_markup=keyboard,
        )

        return PLACES
    
    def wrong_location(self, update: Update, context: CallbackContext) -> int:
        """Handles wrong location input from the user.
        Args:
            update (Update): telegram update object
            context (CallbackContext): telegram context object
        Returns:
            int: New state of the conversation
        """
        update.message.reply_text("I don't understand what you mean. Please try sending the location again.")
        return SEARCH_LOCATION
    
    def cancel(self, update: Update, context: CallbackContext) -> int:
        update.message.reply_text("Bye! I hope we can talk again some day.")
        return ConversationHandler.END

if __name__ == "__main__":
    bot = TelegramBot()
    bot.run()
    