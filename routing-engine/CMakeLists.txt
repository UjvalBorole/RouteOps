# https://download.geofabrik.de/asia.html #this is the source of the map data for the routing engine. It is a .osm.pbf file that contains the map data for the entire continent of Asia. The file is quite large, so it may take some time to download and process.

cmake_minimum_required(VERSION 3.20)
project(routing_engine)

set(CMAKE_CXX_STANDARD 23)
# set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)

FetchContent_Declare(
    asio
    GIT_REPOSITORY https://github.com/chriskohlhoff/asio.git
    GIT_TAG asio-1-28-0
)
FetchContent_MakeAvailable(asio)

include_directories(${asio_SOURCE_DIR}/asio/include)
set(ASIO_INCLUDE_DIR ${asio_SOURCE_DIR}/asio/include CACHE PATH "Asio include dir" FORCE)

FetchContent_Declare(
        crow
        GIT_REPOSITORY https://github.com/CrowCpp/Crow.git
        GIT_TAG master
)
FetchContent_MakeAvailable(crow)

add_executable(routing_engine main.cpp
        Graph.cpp
        Graph.h
        Node.cpp
        Node.h
        Edge.cpp
        Edge.h
        Utils.cpp
        Utils.h)

target_link_libraries(routing_engine PRIVATE Crow::Crow)