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

// Convert TopoJSON to GeoJSON
const worldGeoJSON = feature(countries, countries.objects.countries);
const citiesGeoJSON = require("./assets/cities.json");

export default function App() {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);

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

  const selectArea = (area) => {
    setSelectedArea(area);
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Button
          title="Search Country or City"
          onPress={() => setModalVisible(true)}
        />
      </View>
      <DefaultMap selectedArea={selectedArea} />
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
              `${item.type}-${
                item.properties?.name || item.properties?.NAME || "Unnamed"
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
    position: "absolute",
    top: 35,
    left: 10,
    zIndex: 1,
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
