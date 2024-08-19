import React, { useEffect, useState } from "react";
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

export default function App() {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.length > 2) {
      const filtered = worldGeoJSON.features.filter((feature) =>
        feature.properties.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredCountries(filtered);
    } else {
      setFilteredCountries([]);
    }
  };

  const selectCountry = (country) => {
    setSelectedCountry(country);
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Button title="Select Country" onPress={() => setModalVisible(true)} />
      </View>
      <DefaultMap selectedArea={selectedCountry} />
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Country"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.properties.name}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => selectCountry(item)}>
                <Text style={styles.countryItem}>{item.properties.name}</Text>
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
  countryItem: {
    padding: 10,
    fontSize: 16,
  },
});
