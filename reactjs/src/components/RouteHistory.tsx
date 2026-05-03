import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import apiClient from '../utils/apiClient';
import './Dashboard.css'; // reuse the css

interface Location {
  lat: number;
  lng: number;
}

interface Order {
  id: string;
  startLocation: Location;
  endLocation: Location;
  sessionName: string;
  startAddress: string;
  destinationAddress: string;
  status: string;
  totalDistance: number;
  remainingDistance: number;
}

const RouteHistory: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await apiClient.get('/api/routes');
      setOrders(response.data.map((session: any) => ({
        id: session.sessionId,
        startLocation: { lat: session.startLat, lng: session.startLng },
        endLocation: { lat: session.endLat, lng: session.endLng },
        sessionName: session.sessionName,
        startAddress: session.startAddress,
        destinationAddress: session.destinationAddress,
        status: session.status,
        totalDistance: session.totalDistance ?? 0,
        remainingDistance: session.remainingDistance ?? 0
      })));
    } catch (error) {
      console.error('Failed to load route history', error);
    }
  };

  const statusTemplate = (rowData: Order) => {
    const statusColors: { [key: string]: 'success' | 'warning' | 'danger' | 'info' } = {
      'COMPLETED': 'success',
      'ACTIVE': 'warning',
      'PAUSED': 'warning',
      'CANCELLED': 'danger',
      'PLANNED': 'info'
    };
    return <Tag value={rowData.status} severity={statusColors[rowData.status] || 'info'} />;
  };

  return (
    <div className="dashboard-container route-app-animate">
      <div className="dashboard-wrapper">
        <Card className="orders-card route-card-glow">
          <div className="card-header">
            <h2 className="card-title">Trip History</h2>
            <Tag value={`${orders.length} total`} rounded />
          </div>
          <div className="orders-table-wrapper">
            <DataTable value={orders} paginator rows={10} responsiveLayout="scroll" className="orders-table">
              <Column field="sessionName" header="Session" />
              <Column field="id" header="Session ID" />
              <Column field="startAddress" header="From" />
              <Column field="destinationAddress" header="To" />
              <Column field="status" header="Status" body={statusTemplate} />
              <Column field="totalDistance" header="Total Distance (m)" />
              <Column field="remainingDistance" header="Remaining (m)" />
            </DataTable>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RouteHistory;