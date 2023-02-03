FROM python:3.9-alpine

ADD requirements.txt /tmp/requirements.txt

RUN pip install -r requirements.txt

WORKDIR /app/

ENTRYPOINT ["python3"]