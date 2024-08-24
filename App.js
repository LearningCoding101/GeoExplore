import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Button,
  Modal,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DefaultMap from "./component/DefaultMap";
import countries from "world-atlas/countries-50m.json";
import { feature } from "topojson-client";
import { Ionicons } from '@expo/vector-icons';
import SelectMapType from "./component/SelectMapType";

// Convert TopoJSON to GeoJSON
const worldGeoJSON = feature(countries, countries.objects.countries);
const citiesGeoJSON = require("./assets/cities.json");

export default function App() {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapType, setMapType] = useState("standard");
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [mapTypeModal, setMapTypeModal] = useState(false);
  const handleSearch = (query) => {
    setSearchQuery(query);

    if (query.length > 2) {
      // Filter countries
      const filteredCountries = worldGeoJSON.features.filter(
        (feature) =>
          feature.properties?.name
            ?.toLowerCase()
            .includes(query.toLowerCase()) || false
      );

      // Filter cities
      const filteredCities = citiesGeoJSON.features.filter(
        (feature) =>
          feature.properties?.NAME?.toLowerCase().includes(
            query.toLowerCase()
          ) || false
      );

      // Combine results
      const combinedResults = [
        ...filteredCountries.map((feature) => ({
          ...feature,
          type: "country",
        })),
        ...filteredCities.map((feature) => ({
          ...feature,
          type: "city",
        })),
      ];

      setFilteredResults(combinedResults);
    } else {
      setFilteredResults([]);
    }
  };
  const handleMapTypeChange = (value) => {
    setMapType(value);
  }
  const selectArea = (area) => {
    setSelectedArea(area);
    setModalVisible(false);
  };
  const selectMapType = () => {
    setMapTypeModal(true);
  }
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="search" size={25} />

        </TouchableOpacity>
        <TouchableOpacity onPress={() => selectMapType()} style={styles.topButton}>
          <Ionicons name="layers" size={25} />

        </TouchableOpacity>
        <SelectMapType onMapTypeChange={handleMapTypeChange} visible={mapTypeModal} />

      </View>

      <DefaultMap mapType={mapType} selectedArea={selectedArea} />
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Country or City"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <FlatList
            data={filteredResults}
            keyExtractor={(item) =>
              `${item.type}-${item.properties?.name || item.properties?.NAME || "Unnamed"
              }`
            }
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => selectArea(item)}>
                <Text style={styles.itemText}>
                  {item.properties?.name || item.properties?.NAME || "Unnamed"}{" "}
                  ({item.type})
                </Text>
              </TouchableOpacity>
            )}
          />
          <Button title="Close" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "column", // Changed to row for horizontal layout
    justifyContent: "flex-start", // Space between the buttons
    alignItems: "flex-sart", // Vertically center the buttons
    padding: 10, // Added padding for better spacing
    position: "absolute",
    top: 25,
    gap: 10,
    left: 0,
    right: 0,
    zIndex: 100, // Ensure it's on top of other components
  },
  topButton: {
    height: 50, // Increased size for better visibility
    width: 50,
    borderRadius: 25,
    backgroundColor: "white",
    justifyContent: "center", // Center icon inside the button
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5, // Added elevation for Android shadow
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "white",
    padding: 20,
    marginTop: 100,
  },
  searchInput: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  itemText: {
    padding: 10,
    fontSize: 16,
  },
});
