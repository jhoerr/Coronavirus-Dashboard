const fs = require("fs");
const globals = require("./globals");

exports.getJSONPath = region => {
  return `./tmp/statistics_${region}.json`;
};

exports.getOverridesJSONPath = region => {
  return `./overrides/statistics_${region}.json`;
};

exports.getCSVPath = region => {
  return `./tmp/data_${region}.csv`;
};

exports.getExternalCSV = region => {
  return `https://docs.google.com/spreadsheets/d/12Wi7QBVQ-s_5SaXlK9QwTZ9PMR_kYnBZVveCyF3kgfs/gviz/tq?tqx=out:csv&sheet=${region}`;
};

exports.addAllNumbers = numbers => {
  if (numbers.length === 0) return 0;

  numbers = numbers.map(number => {
    return this.parseCommas(number);
  });
  return numbers.reduce((a, b) => a + b).toLocaleString();
};

const formatRate = (rate, shouldRound=false) => {
  if (isNaN(rate)) return 0
  rate = rate.toString();
  rate = rate.slice(0, rate.indexOf(".") + 3);
  return shouldRound ? Math.ceil(rate) : rate;
}

exports.calculatePercentage = (total, amount, shouldRound = false) => {
  let rate =
    (parseInt(total.replace(",", "")) / parseInt(amount.replace(",", ""))) *
    100;
  return formatRate(rate, shouldRound);
};

exports.calculatePercentageIncrease = (today, total, shouldRound = false) => {
  // percent increase from yesterday = 100 * (today - yesterday) / yesterday, 
  //   where yesterday = total - today.
  let todayParsed = parseInt(today.replace(",", ""))
  let totalParsed = parseInt(total.replace(",", ""))
  let yesterday = totalParsed - todayParsed
  let rate = (totalParsed - yesterday) * 100 / yesterday
  return formatRate(rate, shouldRound);
};

exports.subtractTwoValues = (value1, value2) => {
  return (
    this.parseCommas(value1) - (this.parseCommas(value2) || 0)
  ).toLocaleString();
};

exports.parseCommas = number => {
  number = ["", " ", "-", "N/A"].includes(number) ? "0" : `${number}`;
  return parseInt(number.replace(/,/g, ""), 10);
};

exports.writeJSONFile = (region, data) => {
  if (!!region.regions) {
    if (!region.regions.length) {
      return;
    }
  }
  try {
    fs.writeFileSync(this.getJSONPath(region), JSON.stringify(data));
  } catch (err) {
    console.error(err);
  }
};

exports.remapKeys = (country, keyMapping) => {
  let remappedCountry = { ...globals.countryStructure };
  Object.keys(keyMapping).map(key => {
    remappedCountry[key] = country[keyMapping[key]];
  });

  return remappedCountry;
};

exports.convertAllKeysToString = object => {
  Object.keys(object).map(key => {
    object[key] = isNaN(object[key])
      ? object[key]
      : object[key].toLocaleString();
  });
  return object;
};

exports.calculateRegionTotal = regions => {
  let regionTotalTemplate = { ...globals.countryStructure };
  let allConfirmed = [];
  let allDeaths = [];
  let allRecovered = [];
  let allSerious = [];
  let allTodayCases = [];
  let allTodayDeaths = [];

  regions.map(region => {
    allConfirmed.push(region.cases);
    allDeaths.push(region.deaths);
    allRecovered.push(region.recovered);
    allSerious.push(region.serious);
    allTodayCases.push(region.todayCases);
    allTodayDeaths.push(region.todayDeaths);
  });

  regionTotalTemplate.cases = this.addAllNumbers(allConfirmed);
  regionTotalTemplate.deaths = this.addAllNumbers(allDeaths);
  regionTotalTemplate.recovered = this.addAllNumbers(allRecovered);
  regionTotalTemplate.serious = this.addAllNumbers(allSerious);
  regionTotalTemplate.todayCases = this.addAllNumbers(allTodayCases);
  regionTotalTemplate.todayDeaths = this.addAllNumbers(allTodayDeaths);

  return regionTotalTemplate;
};

exports.getGreaterValue = (value1, value2) => {
  value1 = ["", " ", "-"].includes(value1) ? "0" : `${value1}`;
  value2 = ["", " ", "-"].includes(value2) ? "0" : `${value2}`;

  if (typeof value1 === "string") value1 = this.parseCommas(value1);
  if (typeof value2 === "string") value2 = this.parseCommas(value2);

  return value1 >= value2 ? value1.toLocaleString() : value2.toLocaleString();
};

exports.syncTwoRegions = (regions1, regions2) => {
  regions1.map((country1, country1Index) => {
    regions2.map((country2, country2Index) => {
      if (country1.country !== country2.country) return;
      const countryName = country1.country;
      const country1Data = country1;
      const country2Data = country2;

      let syncRegionData = {
        country: countryName,
        cases: this.getGreaterValue(country1.cases, country2.cases),
        deaths: this.getGreaterValue(country1.deaths, country2.deaths),
        serious: this.getGreaterValue(country1.serious, country2.serious),
        recovered: this.getGreaterValue(country1.recovered, country2.recovered),
        critical: this.getGreaterValue(country1.critical, country2.critical),
        todayCases: this.getGreaterValue(
          country1.todayCases,
          country2.todayCases
        ),
        todayDeaths: this.getGreaterValue(
          country1.todayDeaths,
          country2.todayDeaths
        )
      };

      regions1[country1Index] = syncRegionData;
      regions2[country2Index] = syncRegionData;
    });
  });

  return regions1, regions2;
};

exports.renameCountryLabels = regions => {
  regions.map((country, index) => {
    if (!!globals.AlternativeLabelNames[country.country]) {
      regions[index].country = globals.AlternativeLabelNames[country.country];
    }
  });
  return regions;
};
