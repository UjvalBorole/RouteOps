import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'leaflet/dist/leaflet.css';

interface Vehicle {
  id: number;
  latitude: number;
  longitude: number;
  status: string;
  driverName: string;
}

const AdminPanel: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    latitude: '',
    longitude: '',
    driverName: ''
  });

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const response = await axios.get('/api/vehicles');
      setVehicles(response.data);
    } catch (error) {
      console.error('Failed to load vehicles', error);
    }
  };

  const addVehicle = async () => {
    try {
      await axios.post('/api/vehicles/create', {
        latitude: parseFloat(newVehicle.latitude),
        longitude: parseFloat(newVehicle.longitude),
        driverName: newVehicle.driverName,
        status: 'AVAILABLE'
      });
      toast.success('Vehicle added successfully!');
      setShowAddDialog(false);
      setNewVehicle({ latitude: '', longitude: '', driverName: '' });
      loadVehicles();
    } catch (error) {
      toast.error('Failed to add vehicle');
    }
  };

  const deleteVehicle = async (id: number) => {
    try {
      await axios.delete(`/api/vehicles/${id}`);
      toast.success('Vehicle deleted successfully!');
      loadVehicles();
    } catch (error) {
      toast.error('Failed to delete vehicle');
    }
  };

  return (
    <div className="admin-panel">
      <div className="p-grid">
        <div className="p-col-12">
          <Card title="Fleet Management">
            <Button
              label="Add Vehicle"
              icon="pi pi-plus"
              onClick={() => setShowAddDialog(true)}
              className="p-mb-3"
            />
            <div className="map-container" style={{ height: '400px' }}>
              <MapContainer center={[46.7712, 23.6236]} zoom={13} style={{ height: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {vehicles.map(vehicle => (
                  <Marker key={vehicle.id} position={[vehicle.latitude, vehicle.longitude]}>
                    <Popup>
                      <div>
                        <p>Driver: {vehicle.driverName}</p>
                        <p>Status: {vehicle.status}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </Card>
        </div>
        <div className="p-col-12">
          <Card title="Vehicles List">
            <DataTable value={vehicles} paginator rows={10}>
              <Column field="id" header="ID" />
              <Column field="driverName" header="Driver" />
              <Column field="status" header="Status" />
              <Column
                header="Actions"
                body={(row) => (
                  <Button
                    label="Delete"
                    icon="pi pi-trash"
                    className="p-button-danger"
                    onClick={() => deleteVehicle(row.id)}
                  />
                )}
              />
            </DataTable>
          </Card>
        </div>
      </div>

      <Dialog
        header="Add New Vehicle"
        visible={showAddDialog}
        onHide={() => setShowAddDialog(false)}
        footer={
          <div>
            <Button label="Cancel" onClick={() => setShowAddDialog(false)} />
            <Button label="Add" onClick={addVehicle} />
          </div>
        }
      >
        <div className="p-field">
          <label htmlFor="driverName">Driver Name</label>
          <InputText
            id="driverName"
            value={newVehicle.driverName}
            onChange={(e) => setNewVehicle({ ...newVehicle, driverName: e.target.value })}
          />
        </div>
        <div className="p-field">
          <label htmlFor="latitude">Latitude</label>
          <InputText
            id="latitude"
            value={newVehicle.latitude}
            onChange={(e) => setNewVehicle({ ...newVehicle, latitude: e.target.value })}
          />
        </div>
        <div className="p-field">
          <label htmlFor="longitude">Longitude</label>
          <InputText
            id="longitude"
            value={newVehicle.longitude}
            onChange={(e) => setNewVehicle({ ...newVehicle, longitude: e.target.value })}
          />
        </div>
      </Dialog>
    </div>
  );
};

export default AdminPanel;