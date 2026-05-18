package org.routeops.gateway.config;
//package org.routeops.gateway.config;
//
import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import io.netty.resolver.DefaultAddressResolverGroup;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;
import reactor.netty.resources.ConnectionProvider;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

//@Configuration
//@Slf4j
//public class WebClientConfig {
//
////    @Value("${routeops.routing.url:http://localhost:18080}")
////    private String routingUrl;
//
////    @Bean(name = "routingWebClient")
////    public WebClient routingWebClient() {
////        log.info("Initializing WebClient for Routing Engine with URL: {}", routingUrl);
////
////        // Connection pool configuration
////        ConnectionProvider connectionProvider = ConnectionProvider.builder("custom")
////                .maxConnections(100)
////                .maxIdleTime(Duration.ofSeconds(60))
////                .build();
////
////        // HTTP Client configuration
////        HttpClient httpClient = HttpClient.create(connectionProvider)
////                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000)
////                .option(ChannelOption.SO_KEEPALIVE, true)
////                .responseTimeout(Duration.ofSeconds(10))
////                .doOnConnected(conn ->
////                        conn.addHandlerLast(new ReadTimeoutHandler(10, TimeUnit.SECONDS))
////                                .addHandlerLast(new WriteTimeoutHandler(10, TimeUnit.SECONDS))
////                );
////
////        if (routingUrl == null || routingUrl.isBlank()) {
////            throw new IllegalArgumentException("routeops.routing.url is not configured");
////        }
////
////        log.info("WebClient configured without baseUrl - will use full URLs");
////        return WebClient.builder()
////                .clientConnector(new ReactorClientHttpConnector(httpClient))
////                .build();
////    }
//
////    @Bean(name = "defaultWebClient")
////    public WebClient defaultWebClient() {
////        return WebClient.create();
////    }
//
//    @Bean
////    @LoadBalanced
//    public WebClient.Builder webClientBuilder() {
//        HttpClient httpClient = HttpClient.create()
//                .resolver(DefaultAddressResolverGroup.INSTANCE);
//
//        return WebClient.builder()
//                .clientConnector(new ReactorClientHttpConnector(httpClient));
//    }
//
//    // ✅ Add this extra bean
//    @Bean
//    public WebClient webClient(WebClient.Builder builder) {
//        return builder.build();
//    }
//}


@Configuration
@Slf4j
public class WebClientConfig {

    @Bean(name = "routingWebClient")
    public WebClient routingWebClient(
            @Value("${routeops.routing.url}") String baseUrl
    ) {
        log.info("Intialization of base hostname  as ({})",baseUrl);
        HttpClient httpClient = HttpClient.create();


        return WebClient.builder()
                .baseUrl(baseUrl)
                .build();
    }
}