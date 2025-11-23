/* eslint-disable no-console */
import { OpenRouterService } from "../src/lib/services/openrouter.service";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error("❌ OPENROUTER_API_KEY not set");
    process.exit(1);
  }

  const service = new OpenRouterService({
    apiKey,
    searchModel: process.env.OPENROUTER_SEARCH_MODEL || "openai/gpt-4o-mini",
    fitModel: process.env.OPENROUTER_FIT_MODEL || "openai/gpt-4o-mini",
    timeout: 10000,
    maxRetries: 1,
  });

  console.log("🔍 Testing OpenRouter connection...\n");

  // Test 1: Connection
  try {
    const status = await service.testConnection();
    if (status.success) {
      console.log(`✅ Connection OK (model: ${status.model})`);
    } else {
      console.error(`❌ Connection failed: ${status.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Connection test failed:", error);
    process.exit(1);
  }

  // Test 2: Search
  console.log("\n🔍 Testing plant search...");
  try {
    const searchResult = await service.searchPlants("pomidor");
    console.log("✅ Search OK:");
    console.log(JSON.stringify(searchResult, null, 2));
  } catch (error) {
    console.error("❌ Search failed:", error);
  }

  // Test 3: Fit (simplified context)
  console.log("\n🔍 Testing plant fit check...");
  try {
    const fitResult = await service.checkPlantFit({
      plant_name: "Pomidor",
      location: { lat: 52.2297, lon: 21.0122 },
      orientation: 180,
      climate: {
        annual_temp_avg: 8.5,
        annual_precip: 550,
      },
      cell: { x: 5, y: 10 },
      weather_monthly: [
        { month: 4, temperature: 9, sunlight: 60, humidity: 70, precip: 40 },
        { month: 5, temperature: 14, sunlight: 70, humidity: 65, precip: 55 },
        { month: 6, temperature: 18, sunlight: 75, humidity: 65, precip: 60 },
        { month: 7, temperature: 20, sunlight: 80, humidity: 70, precip: 65 },
        { month: 8, temperature: 19, sunlight: 75, humidity: 70, precip: 60 },
        { month: 9, temperature: 15, sunlight: 65, humidity: 75, precip: 55 },
      ],
    });
    console.log("✅ Fit check OK:");
    console.log(JSON.stringify(fitResult, null, 2));
  } catch (error) {
    console.error("❌ Fit check failed:", error);
  }

  console.log("\n✨ All tests completed!");
}

main().catch(console.error);
