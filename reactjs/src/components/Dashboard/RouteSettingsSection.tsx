/**
 * RouteSettingsSection Component
 * Configuration inputs for route planning parameters
 * Includes session name, vehicle type, and destination thresholds
 */

import React from 'react';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import './styles/RouteSettingsSection.css';

interface RouteSettingsSectionProps {
  // Route configuration
  sessionName: string;
  onSessionNameChange: (value: string) => void;

  vehicleType: string;
  onVehicleTypeChange: (value: string) => void;

  destinationThresholdMeters: number;
  onDestinationThresholdMetersChange: (value: number | undefined) => void;

  destinationThresholdSeconds: number;
  onDestinationThresholdSecondsChange: (value: number | undefined) => void;
}

const RouteSettingsSection: React.FC<RouteSettingsSectionProps> = ({
  sessionName,
  onSessionNameChange,
  vehicleType,
  onVehicleTypeChange,
  destinationThresholdMeters,
  onDestinationThresholdMetersChange,
  destinationThresholdSeconds,
  onDestinationThresholdSecondsChange,
}) => {
  return (
    <div className="route-settings-section">
      {/* Session name input */}
      <div className="address-input-field">
        <label className="input-label">Session Name</label>
        <InputText
          value={sessionName}
          onChange={(e) => onSessionNameChange(e.target.value)}
          placeholder="e.g., Daily Commute, Office Meeting"
        />
      </div>

      {/* Vehicle type input */}
      <div className="address-input-field">
        <label className="input-label">Vehicle Type</label>
        <InputText
          value={vehicleType}
          onChange={(e) => onVehicleTypeChange(e.target.value)}
          placeholder="e.g., car, bike, walking"
        />
      </div>

      {/* Distance threshold for destination detection */}
      <div className="address-input-field">
        <label className="input-label">Distance Threshold (meters)</label>
        <InputNumber
          value={destinationThresholdMeters}
          onValueChange={(e) => onDestinationThresholdMetersChange(e.value ?? 80)}
          min={0}
          max={1000}
          placeholder="Default: 80m"
        />
      </div>

      {/* Time threshold for destination detection */}
      <div className="address-input-field">
        <label className="input-label">Time Threshold (seconds)</label>
        <InputNumber
          value={destinationThresholdSeconds}
          onValueChange={(e) => onDestinationThresholdSecondsChange(e.value ?? 0)}
          min={0}
          max={300}
          placeholder="Optional threshold"
        />
      </div>
    </div>
  );
};

export default RouteSettingsSection;
