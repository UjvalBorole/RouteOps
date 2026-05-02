FROM ubuntu:latest AS builder
LABEL authors="pterodactylstfw, rebekaaranyosi"

ENV DEBIAN_FRONTEND=noninteractive

# necessary tools
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc-14 g++-14 \
    cmake \
    git \
    libasio-dev \
    && rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-14 100 \
    && update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-14 100

WORKDIR /app

COPY . .

RUN mkdir build && cd build && \
    cmake .. && \
    make

FROM ubuntu:latest

RUN apt-get update && apt-get install -y \
    libstdc++6 \
    libgcc-s1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/build/routing_engine .

COPY nodes.csv .
COPY edges.csv .

EXPOSE 18080

CMD ["./routing_engine"]