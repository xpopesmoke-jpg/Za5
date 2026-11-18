import type { RoomType, FixtureType } from "@/server/home-types";
import type { Shape } from "../shape";

/** rooms: the home's Floors, Rooms and Fixtures. English first. */
const en = {
  editRooms: "Edit rooms",
  done: "Done",
  floorN: (n: number) => `Floor ${n}`,
  noRooms: "No rooms yet.",
  noRoomsOwner: "No rooms yet. Add the rooms of your home to get started.",
  fixturesCount: (n: number) => (n === 1 ? "1 fixture" : `${n} fixtures`),
  addRoom: "Add room",
  roomType: "Type",
  roomName: "Name",
  roomNameHint: "Leave empty to use the type as the name.",
  save: "Save",
  remove: "Remove",
  addFixture: "Add fixture",
  pickFixture: "Pick a fixture",
  addFloor: "Add floor",
  floorName: "Floor name",
  removeFloor: "Remove floor",
  removeFloorHint: "Removes the floor and all its rooms.",
  tapAgain: "Tap again to remove",
  roomAndFixture: (room: string, fixture: string) => `${room}, ${fixture.toLowerCase()}`,
  roomTypes: {
    kitchen: "Kitchen", living: "Living room", dining: "Dining room", bedroom: "Bedroom", kids: "Children's room",
    bathroom: "Bathroom", toilet: "Toilet", hall: "Hall", laundry: "Laundry", office: "Office", storage: "Storage",
    terrace: "Terrace or balcony", other: "Other",
  } satisfies Record<RoomType, string>,
  fixtureTypes: {
    shower: "Shower", bathtub: "Bathtub", toilet: "Toilet", sink: "Sink", oven: "Oven", hob: "Hob", fridge: "Fridge",
    dishwasher: "Dishwasher", washing_machine: "Washing machine", dryer: "Dryer", counter: "Counter", window: "Window",
  } satisfies Record<FixtureType, string>,
};

const hr: Shape<typeof en> = {
  editRooms: "Uredi prostorije",
  done: "Gotovo",
  floorN: (n: number) => `Etaža ${n}`,
  noRooms: "Još nema prostorija.",
  noRoomsOwner: "Još nema prostorija. Dodaj prostorije svog doma za početak.",
  fixturesCount: (n: number) => (n === 1 ? "1 element" : `${n} ${n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "elementa" : "elemenata"}`),
  addRoom: "Dodaj prostoriju",
  roomType: "Vrsta",
  roomName: "Ime",
  roomNameHint: "Ostavi prazno za ime po vrsti.",
  save: "Spremi",
  remove: "Ukloni",
  addFixture: "Dodaj element",
  pickFixture: "Odaberi element",
  addFloor: "Dodaj etažu",
  floorName: "Ime etaže",
  removeFloor: "Ukloni etažu",
  removeFloorHint: "Uklanja etažu i sve njezine prostorije.",
  tapAgain: "Dodirni ponovno za uklanjanje",
  roomAndFixture: (room: string, fixture: string) => `${room}, ${fixture.toLowerCase()}`,
  roomTypes: {
    kitchen: "Kuhinja", living: "Dnevni boravak", dining: "Blagovaonica", bedroom: "Spavaća soba", kids: "Dječja soba",
    bathroom: "Kupaonica", toilet: "WC", hall: "Hodnik", laundry: "Praonica", office: "Radna soba", storage: "Ostava",
    terrace: "Terasa ili balkon", other: "Ostalo",
  },
  fixtureTypes: {
    shower: "Tuš", bathtub: "Kada", toilet: "WC školjka", sink: "Sudoper ili umivaonik", oven: "Pećnica", hob: "Ploča za kuhanje",
    fridge: "Hladnjak", dishwasher: "Perilica posuđa", washing_machine: "Perilica rublja", dryer: "Sušilica", counter: "Radna ploča", window: "Prozor",
  },
};

const messages = { en, hr };
export default messages;
