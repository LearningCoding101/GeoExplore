import React, { useEffect, useRef } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Animated } from 'react-native';

const SelectMapType = ({ visible, currentMapType, onMapTypeChange }) => {
  const translateY = useRef(new Animated.Value(-200)).current; // Start off-screen

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : -200,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null; // Return null if the component is not visible

  const mapTypes = [
    { value: 'standard', image: require('../assets/Standard.png') },
    { value: 'satellite', image: require('../assets/Satellite.png') },
    { value: 'hybrid', image: require('../assets/Hybrid.png') },
    { value: 'terrain', image: require('../assets/Terrain.png') },
  ];

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      {mapTypes.map((mapType) => (
        <TouchableOpacity
          key={mapType.value}
          style={[
            styles.button,
            currentMapType === mapType.value && styles.selectedButton,
          ]}
          onPress={() => onMapTypeChange(mapType.value)}
        >
          <Image source={mapType.image} style={styles.buttonImage} />
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 4,
  },
  button: {
    padding: 5,
    marginBottom: 15, // Space between buttons
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5, // Android box shadow
  },
  selectedButton: {
    borderColor: '#007BFF', // Border color for the selected button
    borderWidth: 2,
  },
  buttonImage: {
    width: 50, // Adjust the width and height as needed
    height: 50,
    borderRadius: 8, // Rounded corners for the image
  },
});

export default SelectMapType;
