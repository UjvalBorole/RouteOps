/**
 * AddressInputSection Component
 * Handles input fields for start and destination addresses
 * Provides quick access to GPS location and address validation
 */

import React from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import './styles/AddressInputSection.css';

interface AddressInputSectionProps {
  // Start location inputs
  startAddress: string;
  onStartAddressChange: (value: string) => void;
  onSetStartLocation: () => void;
  onUseGPSLocation: () => void;

  // End location inputs
  endAddress: string;
  onEndAddressChange: (value: string) => void;
  onSetEndLocation: () => void;

  // Loading states
  isLoadingAddressGeocoding: boolean;
  isDetectingGPS: boolean;
}

const AddressInputSection: React.FC<AddressInputSectionProps> = ({
  startAddress,
  onStartAddressChange,
  onSetStartLocation,
  onUseGPSLocation,
  endAddress,
  onEndAddressChange,
  onSetEndLocation,
  isLoadingAddressGeocoding,
  isDetectingGPS,
}) => {
  return (
    <div className="address-section">
      <div className="address-input-group">
        {/* Start location input */}
        <div className="address-input-field">
          <label htmlFor="startAddress" className="input-label">
            From
          </label>
          <div className="input-wrapper">
            <InputText
              id="startAddress"
              value={startAddress}
              onChange={(e) => onStartAddressChange(e.target.value)}
              placeholder="Enter start location (address or coordinates)"
              className="address-input"
            />
            {/* Confirm location button */}
            <Button
              icon="pi pi-check"
              onClick={onSetStartLocation}
              loading={isLoadingAddressGeocoding}
              className="set-location-btn"
              tooltip="Geocode address to coordinates"
            />
            {/* Use current GPS location button */}
            <Button
              icon="pi pi-compass"
              onClick={onUseGPSLocation}
              loading={isDetectingGPS}
              className="set-location-btn"
              tooltip="Use current GPS location as start"
            />
          </div>
        </div>

        {/* End location input */}
        <div className="address-input-field">
          <label htmlFor="endAddress" className="input-label">
            To
          </label>
          <div className="input-wrapper">
            <InputText
              id="endAddress"
              value={endAddress}
              onChange={(e) => onEndAddressChange(e.target.value)}
              placeholder="Enter destination (address or coordinates)"
              className="address-input"
            />
            {/* Confirm destination button */}
            <Button
              icon="pi pi-check"
              onClick={onSetEndLocation}
              loading={isLoadingAddressGeocoding}
              className="set-location-btn"
              tooltip="Geocode address to coordinates"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressInputSection;
