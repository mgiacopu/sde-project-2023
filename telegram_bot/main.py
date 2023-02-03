import os
from dotenv import load_dotenv
from typing import List, Tuple, Dict, Any, Callable

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

load_dotenv()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")

def CQH(callback: Callable, pattern: str) -> CallbackQueryHandler:
    """Shorthand function for CallbackQueryHandler

    Args:
        callback (Callable): the desired callback function
        pattern (str): the string pattern to match

    Returns:
        CallbackQueryHandler: the actual handler
    """
    return CallbackQueryHandler(callback, pattern="^" + pattern + "$")

(
    START,
    SELECT_LOCATION,
    WEATHER,
    FAV_LOCATION,
    SEARCH_LOCATION,
) = map(chr, range(5))

class TelegramBot:

    def __init__(self) -> None:
        pass

    def run(self) -> None:
        updater = Updater(TELEGRAM_TOKEN, use_context=True)
        dispatcher = updater.dispatcher

        main_handler = ConversationHandler(
            entry_points=[CommandHandler("start", self.start)],
            states={
                SELECT_LOCATION: [
                    CQH(self.retrieve_fav_location, FAV_LOCATION),
                    CQH(self.ask_for_location, SEARCH_LOCATION),
                ],
                SEARCH_LOCATION: [
                    MessageHandler((Filters.text | Filters.location), self.verify_location),
                    MessageHandler(~(Filters.text | Filters.location), self.wrong_location),
                ],
                WEATHER: [
                    MessageHandler((Filters.text | Filters.location), self.cancel),
                ],
            },
            fallbacks=[CommandHandler("cancel", self.cancel)],
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

        return SELECT_LOCATION

    def ask_for_location(self, update: Update, context: CallbackContext) -> int:
        
        text = "Send the name of a location you want to search or send your current position."
        
        update.callback_query.answer()
        update.callback_query.edit_message_text(text=text)

        return SEARCH_LOCATION
    
    def retrieve_fav_location(self, update: Update, context: CallbackContext) -> int:
        pass

    def verify_location(self, update: Update, context: CallbackContext) -> int:
        update.message.reply_text("OK")
        return WEATHER
    
    def wrong_location(self, update: Update, context: CallbackContext) -> int:
        update.message.reply_text("I don't understand what you mean. Please try sending the location again.")
        return SEARCH_LOCATION
    
    def cancel(self, update: Update, context: CallbackContext) -> int:
        update.message.reply_text("Bye! I hope we can talk again some day.")
        return ConversationHandler.END

if __name__ == "__main__":
    bot = TelegramBot()
    bot.run()
    