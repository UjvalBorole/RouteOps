import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Divider } from 'primereact/divider';
import { Tag } from 'primereact/tag';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'leaflet/dist/leaflet.css';
import './Dashboard.css';

interface Location {
  lat: number;
  lng: number;
}

interface Order {
  id: number;
  startLocation: Location;
  endLocation: Location;
  status: string;
  price: number;
}

const Dashboard: React.FC = () => {
  const [startAddress, setStartAddress] = useState<string>('');
  const [endAddress, setEndAddress] = useState<string>('');
  const [startLocation, setStartLocation] = useState<Location | null>(null);
  const [endLocation, setEndLocation] = useState<Location | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [route, setRoute] = useState<any>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await axios.get('/api/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to load orders', error);
    }
  };

  const geocodeAddress = async (address: string): Promise<Location | null> => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
      );
      if (response.data.length > 0) {
        const { lat, lon } = response.data[0];
        return { lat: parseFloat(lat), lng: parseFloat(lon) };
      }
      return null;
    } catch (error) {
      console.error('Geocoding failed:', error);
      return null;
    }
  };

  const handleAddressChange = (isStart: boolean, address: string) => {
    if (isStart) {
      setStartAddress(address);
    } else {
      setEndAddress(address);
    }
  };

  const handleSetLocation = async (isStart: boolean) => {
    const address = isStart ? startAddress : endAddress;
    if (!address.trim()) {
      toast.warn('Please enter an address');
      return;
    }

    setLoading(true);
    const location = await geocodeAddress(address);
    setLoading(false);

    if (location) {
      if (isStart) {
        setStartLocation(location);
        toast.success('Start location set');
      } else {
        setEndLocation(location);
        toast.success('Destination location set');
      }
    } else {
      toast.error('Address not found. Please try a different address.');
    }
  };

  const calculateRoute = async () => {
    if (!startLocation || !endLocation) return;

    try {
      const response = await axios.get('/api/route', {
        params: {
          startLat: startLocation.lat,
          startLng: startLocation.lng,
          endLat: endLocation.lat,
          endLng: endLocation.lng
        }
      });
      setRoute(response.data);
      setShowBookingDialog(true);
    } catch (error) {
      toast.error('Failed to calculate route');
    }
  };

  const bookRide = async () => {
    if (!route) return;

    try {
      await axios.post('/api/order', {
        startLocation,
        endLocation,
        route: route.path
      });
      toast.success('Ride booked successfully!');
      setShowBookingDialog(false);
      loadOrders();
    } catch (error) {
      toast.error('Failed to book ride');
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('dark-mode');
  };

  const statusTemplate = (rowData: Order) => {
    const statusColors: { [key: string]: 'success' | 'warning' | 'danger' | 'info' } = {
      'COMPLETED': 'success',
      'IN_PROGRESS': 'warning',
      'CANCELLED': 'danger',
      'PENDING': 'info'
    };
    return <Tag value={rowData.status} severity={statusColors[rowData.status] || 'info'} />;
  };

  const priceTemplate = (rowData: Order) => {
    return <span className="price-tag">${rowData.price.toFixed(2)}</span>;
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        {/* Booking Section */}
        <Card className="booking-card">
          <div className="card-header">
            <h2 className="card-title">Book Your Ride</h2>
            <Button
              icon={darkMode ? 'pi pi-sun' : 'pi pi-moon'}
              rounded
              text
              onClick={toggleDarkMode}
              className="theme-toggle"
              tooltip={darkMode ? 'Light Mode' : 'Dark Mode'}
            />
          </div>

          <Divider />

          {/* Address Inputs */}
          <div className="address-section">
            <div className="address-input-group">
              <div className="address-input-field">
                <label htmlFor="startAddress" className="input-label">
                  <i className="pi pi-map-marker"></i> From
                </label>
                <div className="input-wrapper">
                  <InputText
                    id="startAddress"
                    placeholder="Enter pickup location"
                    value={startAddress}
                    onChange={(e) => handleAddressChange(true, e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSetLocation(true)}
                    className="address-input"
                  />
                  <Button
                    icon="pi pi-check"
                    onClick={() => handleSetLocation(true)}
                    loading={loading}
                    disabled={loading}
                    className="set-location-btn"
                    tooltip="Set location"
                  />
                </div>
                {startLocation && (
                  <small className="location-confirmed">
                    <i className="pi pi-check-circle"></i> Set
                  </small>
                )}
              </div>

              <div className="address-input-field">
                <label htmlFor="endAddress" className="input-label">
                  <i className="pi pi-flag"></i> To
                </label>
                <div className="input-wrapper">
                  <InputText
                    id="endAddress"
                    placeholder="Enter destination"
                    value={endAddress}
                    onChange={(e) => handleAddressChange(false, e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSetLocation(false)}
                    className="address-input"
                  />
                  <Button
                    icon="pi pi-check"
                    onClick={() => handleSetLocation(false)}
                    loading={loading}
                    disabled={loading}
                    className="set-location-btn"
                    tooltip="Set location"
                  />
                </div>
                {endLocation && (
                  <small className="location-confirmed">
                    <i className="pi pi-check-circle"></i> Set
                  </small>
                )}
              </div>
            </div>

            {/* Map */}
            <div className="map-section">
              <div className="map-container">
                <MapContainer center={[46.7712, 23.6236]} zoom={13} style={{ height: '100%' }}>
                  <TileLayer
                    url={darkMode
                      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    }
                  />
                  {startLocation && (
                    <Marker position={[startLocation.lat, startLocation.lng]}>
                      <Popup>📍 Pickup: {startAddress}</Popup>
                    </Marker>
                  )}
                  {endLocation && (
                    <Marker position={[endLocation.lat, endLocation.lng]}>
                      <Popup>🎯 Destination: {endAddress}</Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <Button
                label="Calculate Route"
                icon="pi pi-arrow-right"
                onClick={calculateRoute}
                disabled={!startLocation || !endLocation}
                className="btn-primary"
              />
              <Button
                label="Clear"
                icon="pi pi-times"
                onClick={() => {
                  setStartLocation(null);
                  setEndLocation(null);
                  setStartAddress('');
                  setEndAddress('');
                }}
                className="btn-secondary"
              />
            </div>
          </div>
        </Card>

        {/* Orders Section */}
        <Card className="orders-card">
          <div className="card-header">
            <h2 className="card-title">Your Rides</h2>
            <Tag value={`${orders.length} total`} rounded />
          </div>

          <Divider />

          {orders.length > 0 ? (
            <div className="orders-table-wrapper">
              <DataTable value={orders} paginator rows={5} responsiveLayout="scroll" className="orders-table">
                <Column field="id" header="ID" />
                <Column field="status" header="Status" body={statusTemplate} />
                <Column field="price" header="Price" body={priceTemplate} />
              </DataTable>
            </div>
          ) : (
            <div className="empty-state">
              <i className="pi pi-inbox"></i>
              <p>No rides yet. Book your first ride!</p>
            </div>
          )}
        </Card>
      </div>

      {/* Booking Dialog */}
      <Dialog
        header="Confirm Booking"
        visible={showBookingDialog}
        onHide={() => setShowBookingDialog(false)}
        modal
        className="booking-dialog"
        footer={
          <div className="dialog-footer">
            <Button label="Cancel" onClick={() => setShowBookingDialog(false)} className="p-button-secondary" />
            <Button label="Confirm Booking" onClick={bookRide} className="p-button-primary" />
          </div>
        }
      >
        {route && (
          <div className="booking-details">
            <div className="detail-row">
              <span className="detail-label">Distance:</span>
              <span className="detail-value">{route.distance} km</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Duration:</span>
              <span className="detail-value">{route.duration} min</span>
            </div>
            <Divider />
            <div className="detail-row price-row">
              <span className="detail-label">Estimated Price:</span>
              <span className="detail-value price">${route.price?.toFixed(2)}</span>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default Dashboard;
