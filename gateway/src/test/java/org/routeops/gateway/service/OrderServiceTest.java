package org.routeops.gateway.service;

import java.time.Instant;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.routeops.gateway.dto.RouteResponse;
import org.routeops.gateway.entity.GeoNode;
import org.routeops.gateway.entity.order.OrderStatus;
import org.routeops.gateway.entity.order.TransportOrder;
import org.routeops.gateway.entity.user.Role;
import org.routeops.gateway.entity.user.User;
import org.routeops.gateway.entity.vehicle.EngineType;
import org.routeops.gateway.entity.vehicle.Vehicle;
import org.routeops.gateway.entity.vehicle.VehicleStatus;
import org.routeops.gateway.repository.TransportOrderRepository;
import org.routeops.gateway.repository.VehicleRepository;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.MockitoAnnotations;

class OrderServiceTest {

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private TransportOrderRepository transportOrderRepository;

    @Mock
    private RoutingService routingService;

    @InjectMocks
    private OrderService orderService;

    private User testUser;
    private Vehicle testVehicle;
    private TransportOrder testOrder;
    private RouteResponse mockRoute;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        testUser = User.builder()
                .id("user-1")
                .username("testuser")
                .email("test@example.com")
                .passwordHash("hash")
                .roles(new HashSet<>(Set.of(Role.USER)))
                .enabled(true)
                .createdAt(Instant.now())
                .build();

        testVehicle = Vehicle.builder()
                .id("vehicle-1")
                .licensePlate("AB-123-CD")
                .make("Toyota")
                .model("Corolla")
                .weight(1500.0)
                .engineType(EngineType.PETROL)
                .status(VehicleStatus.AVAILABLE)
                .build();

        List<GeoNode> path = Arrays.asList(
                new GeoNode(1L, 45.6567, 24.5679),
                new GeoNode(2L, 45.6600, 24.5700)
        );

        mockRoute = new RouteResponse("success", 2, 5000.0, path);

        testOrder = TransportOrder.builder()
                .id("order-1")
                .user(testUser)
                .startLat(45.6567)
                .startLng(24.5679)
                .endLat(45.6600)
                .endLng(24.5700)
                .startNodeId(1L)
                .endNodeId(2L)
                .totalDistance(5000.0)
                .vehicle(testVehicle)
                .status(OrderStatus.PENDING)
                .createdAt(Instant.now())
                .build();
    }

    @Test
    void testCreateOrder_Success() {
        when(vehicleRepository.findFirstByStatus(VehicleStatus.AVAILABLE))
                .thenReturn(Optional.of(testVehicle));
        when(routingService.getOptimalRoute(45.6567, 24.5679, 45.6600, 24.5700, 1500.0))
                .thenReturn(mockRoute);
        when(transportOrderRepository.saveAndFlush(any(TransportOrder.class)))
                .thenReturn(testOrder);

        TransportOrder result = orderService.createOrder(testUser, 45.6567, 24.5679, 45.6600, 24.5700);

        assertNotNull(result);
        assertEquals(OrderStatus.PENDING, result.getStatus());
        assertEquals(testUser, result.getUser());
        verify(vehicleRepository, times(1)).findFirstByStatus(VehicleStatus.AVAILABLE);
        verify(transportOrderRepository, times(1)).saveAndFlush(any(TransportOrder.class));
    }

    @Test
    void testCreateOrder_NoVehicleAvailable() {
        when(vehicleRepository.findFirstByStatus(VehicleStatus.AVAILABLE))
                .thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> orderService.createOrder(testUser, 45.6567, 24.5679, 45.6600, 24.5700));

        assertEquals("No available vehicles found for this order.", exception.getMessage());
    }

    @Test
    void testCompleteOrder_Success() {
        testOrder.setStatus(OrderStatus.IN_PROGRESS);
        testVehicle.setStatus(VehicleStatus.BUSY);

        when(transportOrderRepository.findTransportOrdersById("order-1"))
                .thenReturn(Optional.of(testOrder));
        when(vehicleRepository.save(any(Vehicle.class))).thenReturn(testVehicle);
        when(transportOrderRepository.save(any(TransportOrder.class))).thenReturn(testOrder);

        TransportOrder result = orderService.completeOrder("order-1");

        assertNotNull(result);
        assertEquals(OrderStatus.COMPLETED, result.getStatus());
        assertEquals(VehicleStatus.AVAILABLE, testVehicle.getStatus());
        verify(transportOrderRepository, times(1)).findTransportOrdersById("order-1");
    }

    @Test
    void testCompleteOrder_OrderNotFound() {
        when(transportOrderRepository.findTransportOrdersById("order-1"))
                .thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> orderService.completeOrder("order-1"));

        assertEquals("Order not found", exception.getMessage());
    }

    @Test
    void testStartOrder_Success() {
        when(transportOrderRepository.findTransportOrdersById("order-1"))
                .thenReturn(Optional.of(testOrder));
        when(transportOrderRepository.save(any(TransportOrder.class))).thenReturn(testOrder);

        TransportOrder result = orderService.startOrder("order-1");

        assertNotNull(result);
        assertEquals(OrderStatus.IN_PROGRESS, result.getStatus());
    }

    @Test
    void testStartOrder_InvalidStatus() {
        testOrder.setStatus(OrderStatus.COMPLETED);

        when(transportOrderRepository.findTransportOrdersById("order-1"))
                .thenReturn(Optional.of(testOrder));

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> orderService.startOrder("order-1"));

        assertTrue(exception.getMessage().contains("Order cannot be started"));
    }
}
