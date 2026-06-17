#!/bin/sh

# Read the DB password from the mounted Docker Secret file
if [ -f /run/secrets/db_password ]; then
    export SPRING_DATASOURCE_PASSWORD=$(cat /run/secrets/db_password)
fi

# Read the JWT key
if [ -f /run/secrets/jwt_secret ]; then
    export APPLICATION_SECURITY_JWT_SECRET_KEY=$(cat /run/secrets/jwt_secret)
fi

# Start the application
exec java ${JAVA_OPTS} -jar app.jar
