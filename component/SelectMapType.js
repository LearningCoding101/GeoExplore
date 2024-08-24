import React from 'react';
import { View, StyleSheet } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';

const SelectMapType = ({ onMapTypeChange, visible }) => {
  const mapTypeOptions = [
    { label: 'standard', value: 'standard' },
    { label: 'satellite', value: 'satellite' },
    { label: 'hybrid', value: 'hybrid' },
    { label: 'terrain', value: 'terrain' },
  ];
  if(!visible){
    return null;
  }
  return (
    <View style={styles.pickerContainer}>
      <RNPickerSelect
        onValueChange={onMapTypeChange}
        items={mapTypeOptions}
        placeholder={{ label: 'Select Map Type', value: null }}
        style={pickerSelectStyles}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  pickerContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    color: '#000',
    paddingRight: 30,
  },
  inputAndroid: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    color: '#000',
    paddingRight: 30,
  },
});

export default SelectMapType;
