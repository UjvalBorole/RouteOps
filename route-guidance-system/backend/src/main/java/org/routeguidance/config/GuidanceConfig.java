package org.routeguidance.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(GuidanceProperties.class)
public class GuidanceConfig {

    @Bean
    RestClient routingRestClient(GuidanceProperties properties) {
        return RestClient.builder()
                .baseUrl(properties.getRouting().getBaseUrl())
                .build();
    }
}
