package org.routeops.gateway.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.routeops.gateway.entity.vehicle.EngineType;
import org.routeops.gateway.entity.vehicle.Vehicle;
import org.routeops.gateway.entity.vehicle.VehicleStatus;
import org.routeops.gateway.repository.VehicleRepository;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.MockitoAnnotations;

class VehicleServiceTest {

    @Mock
    private VehicleRepository vehicleRepository;

    @InjectMocks
    private VehicleService vehicleService;

    private Vehicle testVehicle;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        testVehicle = Vehicle.builder()
                .id("vehicle-1")
                .licensePlate("AB-123-CD")
                .make("Toyota")
                .model("Corolla")
                .weight(1500.0)
                .engineType(EngineType.PETROL)
                .status(VehicleStatus.AVAILABLE)
                .build();
    }

    @Test
    void testCreateVehicle_Success() {
        when(vehicleRepository.save(any(Vehicle.class))).thenReturn(testVehicle);

        Vehicle result = vehicleService.createVehicle(testVehicle);

        assertNotNull(result);
        assertEquals("AB-123-CD", result.getLicensePlate());
        assertEquals("Toyota", result.getMake());
        assertEquals("Corolla", result.getModel());
        verify(vehicleRepository, times(1)).save(any(Vehicle.class));
    }

    @Test
    void testGetAllVehicles_Success() {
        List<Vehicle> vehicles = Arrays.asList(testVehicle);
        when(vehicleRepository.findAll()).thenReturn(vehicles);

        List<Vehicle> result = vehicleService.getAllVehicles();

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("AB-123-CD", result.get(0).getLicensePlate());
        verify(vehicleRepository, times(1)).findAll();
    }

    @Test
    void testGetAllVehicles_Empty() {
        when(vehicleRepository.findAll()).thenReturn(new ArrayList<>());

        List<Vehicle> result = vehicleService.getAllVehicles();

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testDeleteVehicle_Success() {
        doNothing().when(vehicleRepository).deleteById("vehicle-1");

        assertDoesNotThrow(() -> vehicleService.deleteVehicle("vehicle-1"));
        verify(vehicleRepository, times(1)).deleteById("vehicle-1");
    }

    @Test
    void testDeleteVehicle_NullId() {
        assertDoesNotThrow(() -> vehicleService.deleteVehicle(null));
        verify(vehicleRepository, never()).deleteById(any());
    }

    @Test
    void testUpdateVehicle_Success() {
        Vehicle updatedVehicle = Vehicle.builder()
                .id("vehicle-1")
                .licensePlate("AB-456-EF")
                .make("Honda")
                .model("Civic")
                .weight(1400.0)
                .engineType(EngineType.DIESEL)
                .status(VehicleStatus.BUSY)
                .build();

        when(vehicleRepository.save(any(Vehicle.class))).thenReturn(updatedVehicle);

        Vehicle result = vehicleService.updateVehicle("vehicle-1", updatedVehicle);

        assertNotNull(result);
        assertEquals("vehicle-1", result.getId());
        assertEquals("AB-456-EF", result.getLicensePlate());
        assertEquals("Honda", result.getMake());
        verify(vehicleRepository, times(1)).save(any(Vehicle.class));
    }

    @Test
    void testCreateVehicle_DifferentStatuses() {
        for (VehicleStatus status : VehicleStatus.values()) {
            testVehicle.setStatus(status);
            when(vehicleRepository.save(any(Vehicle.class))).thenReturn(testVehicle);

            Vehicle result = vehicleService.createVehicle(testVehicle);

            assertNotNull(result);
            assertEquals(status, result.getStatus());
        }
    }
}
