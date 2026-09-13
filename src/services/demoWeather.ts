export type DemoWeatherForecast = {
  date: string;
  temperatureC: number;
  temperatureF: number;
  summary: string;
};

const summaries = ['Sunny', 'Partly cloudy', 'Cloudy', 'Light rain', 'Warm breeze'];

export function createDemoWeather(city: string, days: number): DemoWeatherForecast[] {
  const seed = [...city].reduce((total, character) => total + character.charCodeAt(0), 0);
  const today = new Date();

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const temperatureC = 22 + ((seed + index * 7) % 13);

    return {
      date: date.toISOString().slice(0, 10),
      temperatureC,
      temperatureF: Math.round((temperatureC * 9) / 5 + 32),
      summary: summaries[(seed + index) % summaries.length],
    };
  });
}
