export interface Asset {
  id: string;
  asset_library_name: string;
  asset_name: string;
  url_lightroom: string;
  type: string;
}

export interface AssetsData {
  assets: Asset[];
  metadata: {
    version: string;
    lastUpdated: string;
    totalAssets: number;
  };
}

export const assetsData: AssetsData = {
  assets: [
    {
      id: "1",
      asset_library_name: "tds_si_flight_luggage_hours",
      asset_name: "flight luggage hours",
      url_lightroom: "https://s-light.tiket.photos/t/01E25EBZS3W0FY9GTG6C42E1SE/original/si/2021/11/29/ec9aded4-4603-4518-9982-abf2859e69c7-1638203890441-ac380b3e6291095158bee50d38bd94e2.png",
      type: "Spot"
    },
    {
      id: "sample_1704365400000abc123",
      asset_library_name: "tds_si_vacation_planning",
      asset_name: "vacation planning",
      url_lightroom: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop",
      type: "Spot"
    },
    {
      id: "sample_1704365400001def456",
      asset_library_name: "tds_mi_calendar_icon",
      asset_name: "calendar icon", 
      url_lightroom: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=50&h=50&fit=crop",
      type: "Micro"
    },
    {
      id: "sample_1704365400002ghi789",
      asset_library_name: "tds_ic_search_icon",
      asset_name: "search icon",
      url_lightroom: "https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?w=24&h=24&fit=crop",
      type: "Icon"
    }
  ],
  metadata: {
    version: "1.0",
    lastUpdated: "2025-01-04T12:45:00.000Z",
    totalAssets: 4
  }
};