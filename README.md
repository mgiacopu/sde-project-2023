# sde-project-2023

## Description
The final project for the "Service Design and Engineering (SDE)" course for the academic year 2022/2023 is a Telegram bot that, given the name of a location or its geographical coordinates sent as a location, returns a weather report.
This report consists of a map and text: the map is composed of a layer for precipitation and one for the surrounding territory of the requested location.
The text includes information about the weather conditions.
Based on the quality of the forecast, a list of suitable points of interest is proposed to the user, grouped into categories.
Typical restaurants and museums are an example of categories suggested for bad weather, while outdoor parks and tourist attractions are proposed for good weather.
It is also possible to request estimated forecasts for the next 3 days.
Furthermore, the user can save a preferred location and retrieve its weather without having to send the name or location every time.

## Project diagram
The architecture of the main services is the following:  
![Project diagram](./project-diagram.png)

## How to run
Set the environment variables in the following files:
- `.env` file of the `process-centric` folder, given the example in the `process-centric/.env.sample` file;
- `secrets.js` file of the `data-layers` folder, given the example in the `data-layers/secrets.sample.js` file;

Run the containers with the following command in the root folder:
```bash
docker-compose up
```
At this point, the bot is listening and ready to be used.

## Documentation
* Data layer: [http://localhost:8083/api/docs](http://localhost:8083/api/docs)
* Business logic layer: [http://localhost:8084/api/docs](http://localhost:8084/api/docs)
* Process centric layer: ![Chatbot flow](./process-centric/chatbot_flow.png)
