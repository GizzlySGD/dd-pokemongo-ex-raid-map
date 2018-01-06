"use strict";

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var fetchLocal = function fetchLocal(url) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(JSON.parse(xhr.responseText));
    };
    xhr.onerror = function () {
      reject(new TypeError("Local request failed"));
    };
    xhr.open("GET", url);
    xhr.send(null);
  });
};

var renderPopup = function renderPopup(layer) {
  var feature = layer.feature;
  var dates = feature.properties.dates;
  var lngLat = feature.geometry.coordinates;
  lngLat = lngLat.map(function (x) {
    return Math.round(x * 1000000) / 1000000;
  });

  var exraidHTML = "";
  if (dates && dates.length > 0) {
    exraidHTML += "<div>EX-raids:<ul>";
    dates.forEach(function (date) {
      exraidHTML += "<li>" + moment(date).format("D MMM") + "</li>";
    });
    exraidHTML += "</ul></div>";
  } else {
    exraidHTML += "<div>No EX-raid yet</div>";
  }

  return "\n    <strong>\n    " + feature.properties.name + "\n    </strong>\n    " + exraidHTML + "\n    <div>S2 Cell: " + feature.properties.s2Cell + "</div>\n    <br/>\n    <div>\n      <a target=\"_blank\" href=\"\n      https://www.google.com/maps/search/?api=1&query=" + lngLat[1] + "," + lngLat[0] + "\n      \">\n        Google Maps\n      </a>\n    </div>\n    <br/>\n    <div>\n      <a target=\"_blank\" href=\"\n      https://sgpokemap.com/gym.html#" + lngLat[1] + "," + lngLat[0] + "\n      \">\n        SGPokemap\n      </a>\n    </div>\n    ";
};

var markers = L.markerClusterGroup({
  maxClusterRadius: function maxClusterRadius() {
    return currentFilter === "raids" ? 0 : 80;
  },
  disableClusteringAtZoom: 14,
  spiderfyOnMaxZoom: false
});
var map = L.map("map", {
  center: [1.358, 103.833],
  zoom: 12,
  minZoom: 10
}).on("overlayadd", function () {
  $("#secondary-group > .active > input").trigger("change");
});
var gyms = void 0;
var s2 = void 0;
var terrains = [];
var dates = [];
var currentFilter = "raids";
var s2TextLayer = L.featureGroup();
var s2PolygonLayer = L.geoJSON();
var s2LayerGroup = L.featureGroup([s2TextLayer, s2PolygonLayer]);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors | <a href="https://goo.gl/forms/jVQOTAdsE9KdGIe52" target="_blank">Missing raid location?</a>'
}).addTo(map);

L.control.locate().addTo(map);

var addToMap = function addToMap() {
  var filter = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {
    return true;
  };

  var s2CellCount = {};
  var onEachFeature = function onEachFeature() {};
  var isS2Toggled = map.hasLayer(s2LayerGroup);
  if (isS2Toggled) {
    onEachFeature = function onEachFeature(feature) {
      var total = feature.properties.dates.length;
      var s2Cell = s2CellCount[feature.properties.s2Cell];

      if (s2Cell) {
        s2CellCount[feature.properties.s2Cell] = {
          count: s2Cell.count + 1,
          total: s2Cell.total + total
        };
      } else {
        s2CellCount[feature.properties.s2Cell] = { count: 1, total: total };
      }
    };
  }

  var layer = L.geoJSON(gyms, {
    filter: filter,
    pointToLayer: function pointToLayer(geoJsonPoint, latLng) {
      return L.marker(latLng, {
        opacity: isS2Toggled ? 0.7 : 1
      });
    },
    onEachFeature: onEachFeature
  });

  if (isS2Toggled) {
    overlayS2Labels(s2CellCount);
  }

  markers.clearLayers();
  markers.addLayer(layer).bindPopup(renderPopup, { autoPanPaddingTopLeft: [100, 100] });
  map.addLayer(markers);
  return markers;
};

var overlayS2Labels = function overlayS2Labels(s2CellCount) {
  var markers = s2.features.map(function (feature) {
    var s2Cell = feature.properties.order;

    var _ref = s2CellCount[s2Cell] || {},
        count = _ref.count,
        total = _ref.total;

    var html = "";
    if (count > 1) {
      html = s2Cell + " (" + count + "x" + total + ")";
    } else if (count) {
      html = s2Cell + " (" + total + ")";
    }
    return L.marker([feature.coordinates[0][3][1], feature.coordinates[0][3][0]], {
      icon: L.divIcon({
        className: "s2-label",
        html: html
      })
    });
  });

  s2LayerGroup.removeLayer(s2TextLayer);
  s2TextLayer = L.featureGroup(markers);
  s2LayerGroup.addLayer(s2TextLayer);
};

fetchLocal("https://cdn.rawgit.com/xiankai/fc4260e305d1339756a3e1a02b495939/raw/2c81f0bb91e80cc14b8fe1fb9e14ba6cfd2a4500/all.geojson").then(function (data) {
  var _ref2, _ref3;

  gyms = data;

  terrains = (_ref2 = []).concat.apply(_ref2, _toConsumableArray(gyms.features.map(function (feature) {
    return feature.properties.terrains;
  })));
  terrains = terrains.filter(function (item, pos) {
    return item && terrains.indexOf(item) === pos;
  }).sort(function (a, b) {
    return moment(b) - moment(a);
  });

  dates = (_ref3 = []).concat.apply(_ref3, _toConsumableArray(gyms.features.map(function (feature) {
    return feature.properties.dates;
  })));
  dates = dates.filter(function (item, pos) {
    return item && dates.indexOf(item) === pos;
  }).sort(function (a, b) {
    return moment(b) - moment(a);
  });
  dates.reverse();

  // show submenu at start
  $('#primary-group [value="raids"]').trigger("change");

  return Promise.resolve();
}).then(function () {
  return fetchLocal("https://cdn.rawgit.com/xiankai/0f2af25f0cd91d16cb59f846fa2bde36/raw/de48c7b21d497265f2254260bccd6cd464442139/S2.geojson");
}).then(function (data) {
  s2 = data;
  s2PolygonLayer.addData(data);

  L.control.layers(null, { "S2 L12": s2LayerGroup }).addTo(map);
});

$("#primary-group").on("change", 'input[type="radio"]', function (e) {
  currentFilter = e.target.value;
  $("#secondary-group").empty();
  var defaultButton = void 0;
  var key = void 0;
  switch (e.target.value) {
    case "raids":
      key = "dates";
      defaultButton = dates[dates.length - 1];

      dates.forEach(function (date) {
        $("#secondary-group").prepend("\n          <label class=\"btn btn-secondary\" for=\"" + date + "\">\n            <input type=\"radio\" name=\"" + key + "\" id=\"" + date + "\" value=\"" + date + "\">\n            " + moment(date).format("D MMM") + "\n          </label>\n        ");
      });

      // default
      $("#secondary-group").prepend("\n        <label class=\"btn btn-secondary\" for=\"all\">\n          <input type=\"radio\" name=\"" + key + "\" id=\"all\" value=\"all\" checked>\n          All\n        </label>\n      ");
      break;
    case "all":
      addToMap();
      break;
    case "parks":
      key = "terrains";
      defaultButton = "2016-08-01";
      addToMap(function (feature) {
        return feature.properties[key] && feature.properties[key].indexOf(defaultButton) > -1;
      });

      // default
      $("#secondary-group").append("\n        <label class=\"btn btn-light\" disabled>\n          Map date\n        </label>\n      ");

      terrains.forEach(function (terrain) {
        $("#secondary-group").append("\n          <label class=\"btn btn-secondary\" for=\"" + terrain + "\">\n            <input type=\"radio\" name=\"" + key + "\" id=\"" + terrain + "\" value=\"" + terrain + "\"\n              " + (terrain === defaultButton ? "checked" : "") + ">\n            " + moment(terrain).format("MMM YYYY") + "\n          </label>\n        ");
      });
      break;
  }
  $('#secondary-group input[type="radio"]').button();
  $("#secondary-group label[for=\"" + defaultButton + "\"]").button("toggle");
});

$("#secondary-group").on("change", 'input[type="radio"]', function (e) {
  var key = $(this).prop("name");
  if (e.target.value === "all") {
    addToMap(function (feature) {
      return feature.properties[key] && feature.properties[key].length > 0;
    });
  } else {
    addToMap(function (feature) {
      return feature.properties[key] && feature.properties[key].indexOf(e.target.value) > -1;
    });
  }
});
