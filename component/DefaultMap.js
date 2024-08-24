import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import MapView, { Polygon, Polyline } from "react-native-maps";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import * as turf from "@turf/turf";
import * as BackgroundFetch from "expo-background-fetch";
import { registerBackgroundFetch } from "../task/location-fetch";
import { ActivityIndicator } from "react-native";
import SelectMapType from "./SelectMapType";

const DefaultMap = ({mapType, selectedArea }) => {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [locations, setLocations] = useState([]);
  const [buffer, setBuffer] = useState([]);
  const [color, setColor] = useState("rgba(0,0,255,0.2)"); // Default color
  const [zoneFrequency, setZoneFrequency] = useState({});
  const [exploredArea, setExploredArea] = useState(0);
  const [bufferSize, setBufferSize] = useState(100);
  useEffect(() => {
    registerBackgroundFetch();
    BackgroundFetch.setMinimumIntervalAsync(15 * 60);
  }, []);
  //calculate the total area covered everytime new locations is added
  useEffect(() => {
    if (selectedArea == null) {
      setExploredArea(0);
      return;
    }
    if (locations.length > 1) {
      const path = turf.lineString(
        locations.map((loc) => [loc.longitude, loc.latitude])
      );
      const areaCovered = turf.buffer(path, bufferSize, { units: "meters" });
      let totalArea;
      if (selectedArea.geometry.type === "MultiPolygon") {
        totalArea = turf.multiPolygon(selectedArea.geometry.coordinates);
      } else {
        totalArea = turf.polygon(selectedArea.geometry.coordinates);
      }

      // Calculate intersection and explored area
      let intersectArea = null;

      // If totalArea is a Polygon, intersect directly
      intersectArea = turf.intersect(
        turf.featureCollection([totalArea, areaCovered])
      );

      if (intersectArea) {
        const explored = turf.area(intersectArea) / turf.area(totalArea);
        setExploredArea(explored);
      } else {
        setExploredArea(0);
      }
    } else {
      setExploredArea(0); // No coverage if fewer than 2 locations
    }
  }, [locations, selectedArea]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      let savedLocations = await AsyncStorage.getItem("userLocations");
      if (savedLocations) {
        setLocations(JSON.parse(savedLocations));
      }

      try {
        let location = await Location.getCurrentPositionAsync({});
        setLocation(location.coords);
      } catch (error) {
        setErrorMsg("Failed to get current location");
      }

      const MIN_DISTANCE = 10; // Minimum distance in meters

      const watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          const newCoords = { latitude, longitude };

          // Calculate distance between last location and new location
          if (locations.length > 0) {
            const lastLocation = locations[locations.length - 1];
            const distance = turf.distance(
              turf.point([lastLocation.longitude, lastLocation.latitude]),
              turf.point([longitude, latitude]),
              { units: "meters" }
            );

            if (distance < MIN_DISTANCE) {
              return; // Do not capture the location if the user hasn't moved significantly
            }
          }

          setLocations((prevLocation) => {
            const updatedLocations = [...prevLocation, newCoords];
            AsyncStorage.setItem(
              "userLocations",
              JSON.stringify(updatedLocations)
            );

            // Define grid size (e.g., 0.01 degrees)
            const gridSize = 0.01;
            const gridKey = `${Math.round(latitude / gridSize)}_${Math.round(
              longitude / gridSize
            )}`;

            setZoneFrequency((prevMap) => {
              const newMap = { ...prevMap };
              newMap[gridKey] = (newMap[gridKey] || 0) + 1;
              return newMap;
            });

            if (updatedLocations.length > 1) {
              const line = turf.lineString(
                updatedLocations.map((loc) => [loc.longitude, loc.latitude])
              );
              const buffered = turf.buffer(line, bufferSize, { units: "meters" });
              const bufferCoords = buffered.geometry.coordinates[0].map(
                ([longitude, latitude]) => ({
                  latitude,
                  longitude,
                })
              );

              // Update color based on zone frequency
              const maxFrequency = Math.max(...Object.values(zoneFrequency));
              const visitCount = zoneFrequency[gridKey] || 0;
              const newColor = getColorFromFrequency(visitCount, maxFrequency);
              setBuffer(bufferCoords);
              setColor(newColor);
            }
            return updatedLocations;
          });
        }
      );

      return () => {
        watchId.remove();
      };
    })();
  }, [zoneFrequency]);

  const getColorFromFrequency = (frequency, maxFrequency) => {
    const ratio = Math.min(frequency / maxFrequency, 1);
    const red = Math.round(255 * (1 - ratio));
    const blue = Math.round(255 * ratio);
    return `rgba(${red}, 0, ${blue}, 0.2)`;
  };

  if (errorMsg) {
    return (
      <View style={styles.centerContainer}>
        <Text>{errorMsg}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size={"large"} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        style={styles.mainMap}
        initialRegion={{
          latitude: location?.latitude || 0,
          longitude: location?.longitude || 0,
          latitudeDelta: 0.05, // Smaller value for a closer view
          longitudeDelta: 0.05, // Smaller value for a closer view
        }}
        showsUserLocation={true}
        zoomEnabled={true}
        scrollEnabled={true}
        mapType={mapType? mapType : "standard"}
      >
        {locations.length > 1 && (
          <>
            <Polyline
              coordinates={locations}
              strokeColor="#00FF00"
              strokeWidth={3}
            />
            {/* Render the gradient buffer zone */}
            <Polygon
              coordinates={buffer}
              strokeColor="transparent"
              strokeWidth={0}
              fillColor={color} // Gradient color
            />
          </>
        )}
        {selectedArea && selectedArea.geometry.type === "Polygon" && (
          <Polygon
            coordinates={selectedArea.geometry.coordinates[0].map(
              ([longitude, latitude]) => ({ latitude, longitude })
            )}
            strokeColor="#FF0000"
            strokeWidth={2}
            fillColor="rgba(255,0,0,0.1)"
          />
        )}
        {selectedArea &&
          selectedArea.geometry.type === "MultiPolygon" &&
          selectedArea.geometry.coordinates.map((polygon, index) => (
            <Polygon
              key={index}
              coordinates={polygon[0].map(([longitude, latitude]) => ({
                latitude,
                longitude,
              }))}
              strokeColor="#FF0000"
              strokeWidth={2}
              fillColor="rgba(255,0,0,0.1)"
            />
          ))}
          <View style={styles.explored} >
          <Text style={{textAlign: "center"}} >{(exploredArea * 100).toFixed(2)}%</Text>
          </View>
                

      </MapView>
      {selectedArea && (
        <View style={styles.infoBox}>
          <Text>{selectedArea.name}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center"
  },
  mainMap: {
    flex: 1,
    justifyContent : "flex-end",
    alignItems:"center"
  },
  infoBox: {
    padding: 10,
    backgroundColor: "white",
    alignItems: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  explored: {
    width: 70,
    height: 30, // Add height to make it a rectangle
    marginBottom: 50,
    backgroundColor: "white",
    borderWidth: 2, // Border thickness
    borderColor: "black", // Border color
    borderRadius: 8, // Rounded corners
    justifyContent: 'center', // Center text vertically
    alignItems: 'center', // Center text horizontally
    textAlign: "center", // Center text horizontally (not needed here, but kept for consistency)
  }
});

export default DefaultMap;
