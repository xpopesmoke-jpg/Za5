import type { RoomType } from "@/server/home-types";
import type { LibraryChore, LibrarySupply, Placement } from "./library";

/*
 * Za5's starter library: the Chores and Supplies suggested when a home is set up. Every entry is in English and
 * Croatian. Chores use the imperative ("Clean the toilet" / "Očisti WC školjku"), the way people say them to
 * each other. Schedules count days from the last completion; Effort is a realistic estimate in minutes.
 */

const chore = (key: string, en: string, hr: string, placement: Placement, o: { every: number; minutes: number }): LibraryChore => ({
  key,
  text: { en, hr },
  placement,
  schedule: { kind: "every", days: o.every },
  effort: o.minutes,
});

const supply = (key: string, en: string, hr: string, placement: Placement): LibrarySupply => ({ key, text: { en, hr }, placement });

// A Room counts as a kitchen when it is one, or when it has a hob or an oven ("Living + kitchen").
// (A fridge or dishwasher alone does not: a fridge in the storage room is still a storage room.)
const KITCHEN = { rooms: ["kitchen"], via: ["hob", "oven"] } satisfies Placement;
const BATH: Placement = { rooms: ["bathroom", "toilet"] };
const SLEEP: Placement = { rooms: ["bedroom", "kids"] };
const DRY_ROOMS: RoomType[] = ["bedroom", "kids", "living", "dining", "office"];
// Washing happens at the machine, often in the bathroom; hanging, folding and ironing happen around the home.
const WASHER = { rooms: ["laundry"], fixtures: ["washing_machine"] } satisfies Placement;

export const LIBRARY_CHORES: LibraryChore[] = [
  // Kitchen
  chore("wash-dishes", "Wash the dishes", "Operi posuđe", { ...KITCHEN, notWith: ["dishwasher"] }, { every: 1, minutes: 15 }),
  chore("run-dishwasher", "Run the dishwasher", "Pokreni perilicu posuđa", { fixtures: ["dishwasher"] }, { every: 1, minutes: 5 }),
  chore("empty-dishwasher", "Empty the dishwasher", "Isprazni perilicu posuđa", { fixtures: ["dishwasher"] }, { every: 1, minutes: 5 }),
  chore("dishwasher-filter", "Clean the dishwasher filter", "Očisti filter perilice posuđa", { fixtures: ["dishwasher"] }, { every: 30, minutes: 10 }),
  chore("wipe-counters", "Wipe the counters", "Obriši radne plohe", { ...KITCHEN, via: [...KITCHEN.via, "counter"] }, { every: 1, minutes: 5 }),
  chore("clean-hob", "Clean the hob", "Očisti ploču za kuhanje", { fixtures: ["hob"] }, { every: 3, minutes: 10 }),
  chore("extractor-filter", "Clean the extractor hood filter", "Očisti filter nape", { fixtures: ["hob"] }, { every: 60, minutes: 15 }),
  chore("clean-oven", "Clean the oven", "Očisti pećnicu", { fixtures: ["oven"] }, { every: 30, minutes: 40 }),
  chore("clean-microwave", "Clean the microwave", "Očisti mikrovalnu pećnicu", KITCHEN, { every: 14, minutes: 10 }),
  chore("fridge-clear-out", "Throw out old food from the fridge", "Izbaci staru hranu iz hladnjaka", { fixtures: ["fridge"] }, { every: 7, minutes: 10 }),
  chore("clean-fridge", "Clean the inside of the fridge", "Očisti hladnjak iznutra", { fixtures: ["fridge"] }, { every: 30, minutes: 30 }),
  chore("defrost-freezer", "Defrost the freezer", "Odledi zamrzivač", { fixtures: ["fridge"] }, { every: 180, minutes: 45 }),
  chore("kitchen-sink", "Scrub the kitchen sink", "Izribaj sudoper", KITCHEN, { every: 7, minutes: 5 }),
  chore("mop-kitchen", "Mop the kitchen floor", "Operi pod u kuhinji", KITCHEN, { every: 7, minutes: 15 }),
  chore("take-out-bins", "Take out the bins", "Iznesi smeće", KITCHEN, { every: 2, minutes: 5 }),
  chore("take-out-recycling", "Take out the recycling", "Iznesi otpad za reciklažu", KITCHEN, { every: 7, minutes: 5 }),
  chore("wipe-cabinets", "Wipe the cupboard doors", "Obriši vrata kuhinjskih ormarića", KITCHEN, { every: 30, minutes: 15 }),
  chore("descale-kettle", "Descale the kettle", "Očisti kuhalo za vodu od kamenca", KITCHEN, { every: 30, minutes: 5 }),
  chore("descale-coffee", "Descale the coffee machine", "Očisti aparat za kavu od kamenca", KITCHEN, { every: 60, minutes: 10 }),
  chore("tidy-pantry", "Tidy the food cupboard and check dates", "Pospremi smočnicu i provjeri rokove trajanja", KITCHEN, { every: 60, minutes: 20 }),
  chore("wipe-table", "Wipe the dining table", "Obriši blagovaonski stol", { rooms: ["dining", "kitchen"], via: ["hob"] }, { every: 1, minutes: 2 }),

  // Bathroom and toilet
  chore("clean-toilet", "Clean the toilet", "Očisti WC školjku", { rooms: ["toilet"], fixtures: ["toilet"] }, { every: 7, minutes: 10 }),
  chore("toilet-brush", "Clean the toilet brush", "Očisti četku za WC", { rooms: ["toilet"], fixtures: ["toilet"] }, { every: 30, minutes: 5 }),
  chore("bathroom-sink", "Clean the basin and taps", "Očisti umivaonik i slavine", BATH, { every: 7, minutes: 5 }),
  chore("wipe-mirror", "Wipe the mirror", "Obriši ogledalo", BATH, { every: 7, minutes: 5 }),
  chore("clean-shower", "Clean the shower", "Očisti tuš-kabinu", { fixtures: ["shower"] }, { every: 7, minutes: 15 }),
  chore("clean-bathtub", "Clean the bathtub", "Očisti kadu", { fixtures: ["bathtub"] }, { every: 7, minutes: 15 }),
  chore("shower-glass", "Wash the shower curtain or wipe the glass", "Operi zavjesu za tuš ili obriši staklo", { fixtures: ["shower", "bathtub"] }, { every: 30, minutes: 10 }),
  chore("descale-shower", "Descale the shower head and taps", "Očisti tuš i slavine od kamenca", { fixtures: ["shower", "bathtub"] }, { every: 30, minutes: 15 }),
  chore("clear-drains", "Clear the drains", "Očisti odvode", { fixtures: ["shower", "bathtub"] }, { every: 30, minutes: 10 }),
  chore("scrub-grout", "Scrub the tile grout", "Izribaj fuge na pločicama", { rooms: ["bathroom"] }, { every: 60, minutes: 30 }),
  chore("mop-bathroom", "Mop the bathroom floor", "Operi pod u kupaonici", { rooms: ["bathroom"] }, { every: 7, minutes: 10 }),
  chore("mop-toilet", "Mop the toilet floor", "Operi pod u WC-u", { rooms: ["toilet"] }, { every: 7, minutes: 5 }),
  chore("change-towels", "Change the towels", "Promijeni ručnike", { rooms: ["bathroom"] }, { every: 4, minutes: 5 }),
  chore("wash-bath-mat", "Wash the bath mat", "Operi kupaonski tepih", { rooms: ["bathroom"] }, { every: 14, minutes: 5 }),
  chore("empty-bathroom-bin", "Empty the bin", "Isprazni kantu za smeće", BATH, { every: 7, minutes: 2 }),

  // Bedrooms (the children's room shares the bed Chores)
  chore("change-sheets", "Change the bed sheets", "Promijeni posteljinu", SLEEP, { every: 7, minutes: 15 }),
  chore("air-room", "Air the room", "Prozrači sobu", SLEEP, { every: 1, minutes: 2 }),
  chore("turn-mattress", "Turn the mattress", "Okreni madrac", SLEEP, { every: 90, minutes: 10 }),
  chore("wash-duvet", "Wash the pillows and duvet", "Operi jastuke i poplun", SLEEP, { every: 180, minutes: 20 }),
  chore("vacuum-under-bed", "Vacuum under the bed", "Usisaj ispod kreveta", SLEEP, { every: 30, minutes: 10 }),
  chore("tidy-wardrobe", "Tidy the wardrobe", "Pospremi ormar", { rooms: ["bedroom"] }, { every: 30, minutes: 20 }),

  // Floors and dust in the dry rooms
  chore("vacuum-floor", "Vacuum the floor", "Usisaj pod", { rooms: [...DRY_ROOMS, "hall"] }, { every: 7, minutes: 15 }),
  chore("dust-surfaces", "Dust the surfaces", "Obriši prašinu", { rooms: DRY_ROOMS }, { every: 7, minutes: 10 }),

  // Children's room
  chore("tidy-toys", "Tidy the toys", "Pospremi igračke", { rooms: ["kids"] }, { every: 1, minutes: 10 }),
  chore("wash-toys", "Wash the toys", "Operi igračke", { rooms: ["kids"] }, { every: 30, minutes: 20 }),
  chore("sort-outgrown-clothes", "Sort out clothes that are too small", "Izdvoji premalu odjeću", { rooms: ["kids"] }, { every: 90, minutes: 30 }),
  chore("clear-desk", "Clear the desk", "Pospremi radni stol", { rooms: ["kids", "office"] }, { every: 7, minutes: 10 }),

  // Living room
  chore("tidy-living", "Tidy the living room", "Pospremi dnevni boravak", { rooms: ["living"] }, { every: 1, minutes: 10 }),
  chore("vacuum-sofa", "Vacuum the sofa", "Usisaj kauč", { rooms: ["living"] }, { every: 14, minutes: 10 }),
  chore("wash-cushion-covers", "Wash the cushion covers", "Operi navlake za jastuke", { rooms: ["living"] }, { every: 60, minutes: 15 }),
  chore("dust-tv", "Dust the TV and electronics", "Obriši prašinu s televizora i elektronike", { rooms: ["living"] }, { every: 14, minutes: 5 }),
  chore("clean-rug", "Clean the rug", "Očisti tepih", { rooms: ["living"] }, { every: 90, minutes: 30 }),

  // Hall
  chore("tidy-shoes", "Tidy the shoes", "Pospremi cipele", { rooms: ["hall"] }, { every: 7, minutes: 5 }),
  chore("shake-doormat", "Shake out the doormat", "Istresi otirač", { rooms: ["hall"] }, { every: 7, minutes: 5 }),
  chore("mop-hall", "Mop the hall floor", "Operi pod u hodniku", { rooms: ["hall"] }, { every: 7, minutes: 10 }),
  chore("sort-coats", "Sort the coats and bags", "Pospremi jakne i torbe", { rooms: ["hall"] }, { every: 14, minutes: 10 }),
  chore("wipe-front-door", "Wipe the front door and handles", "Obriši ulazna vrata i kvake", { rooms: ["hall"] }, { every: 30, minutes: 5 }),

  // Terrace or balcony
  chore("sweep-terrace", "Sweep the terrace", "Pometi terasu", { rooms: ["terrace"] }, { every: 7, minutes: 15 }),
  chore("water-terrace-plants", "Water the terrace plants", "Zalij biljke na terasi", { rooms: ["terrace"] }, { every: 2, minutes: 10 }),
  chore("wipe-outdoor-furniture", "Wipe the outdoor furniture", "Obriši vanjski namještaj", { rooms: ["terrace"] }, { every: 30, minutes: 15 }),
  chore("wash-terrace", "Wash the terrace floor", "Operi terasu", { rooms: ["terrace"] }, { every: 30, minutes: 30 }),
  chore("terrace-drain", "Clear the terrace drain", "Očisti odvod na terasi", { rooms: ["terrace"] }, { every: 60, minutes: 10 }),

  // Laundry: the washing at the machine, the rest around the home
  chore("do-laundry", "Do a load of laundry", "Operi rublje", WASHER, { every: 3, minutes: 10 }),
  chore("hang-laundry", "Hang up or dry the laundry", "Objesi ili osuši rublje", "whole", { every: 3, minutes: 10 }),
  chore("fold-laundry", "Fold and put away the clothes", "Složi i pospremi odjeću", "whole", { every: 3, minutes: 15 }),
  chore("ironing", "Do the ironing", "Izglačaj odjeću", "whole", { every: 7, minutes: 30 }),
  chore("washer-cleaning-cycle", "Run a cleaning cycle on the washing machine", "Pokreni program čišćenja perilice rublja", WASHER, { every: 30, minutes: 5 }),
  chore("washer-seal", "Wipe the washing machine seal and drawer", "Obriši gumu i ladicu perilice rublja", WASHER, { every: 30, minutes: 10 }),
  chore("dryer-lint", "Empty the dryer's lint filter", "Očisti filter sušilice", { fixtures: ["dryer"] }, { every: 3, minutes: 2 }),

  // Office and storage
  chore("empty-paper-bin", "Empty the paper bin", "Isprazni koš za papir", { rooms: ["office"] }, { every: 7, minutes: 2 }),
  chore("wipe-keyboard", "Wipe the keyboard and screen", "Obriši tipkovnicu i ekran", { rooms: ["office"] }, { every: 14, minutes: 5 }),
  chore("tidy-storage", "Tidy the storage room", "Pospremi spremište", { rooms: ["storage"] }, { every: 60, minutes: 30 }),

  // Windows
  chore("clean-windows", "Clean the windows", "Operi prozore", { fixtures: ["window"] }, { every: 30, minutes: 20 }),
  chore("wipe-sills", "Wipe the window sills", "Obriši prozorske daske", { fixtures: ["window"] }, { every: 14, minutes: 5 }),

  // Whole home
  chore("water-plants", "Water the indoor plants", "Zalij sobne biljke", "whole", { every: 3, minutes: 10 }),
  chore("pay-bills", "Pay the bills", "Plati račune", "whole", { every: 30, minutes: 15 }),
  chore("weekly-shop", "Do the weekly shop", "Obavi tjednu kupnju", "whole", { every: 7, minutes: 60 }),
  chore("plan-meals", "Plan the week's meals", "Isplaniraj tjedni jelovnik", "whole", { every: 7, minutes: 15 }),
  chore("sort-post", "Sort the post", "Razvrstaj poštu", "whole", { every: 7, minutes: 5 }),
  chore("test-smoke-alarm", "Test the smoke alarm", "Provjeri detektor dima", "whole", { every: 30, minutes: 2 }),
  chore("wipe-switches", "Wipe the light switches and door handles", "Obriši prekidače i kvake", "whole", { every: 14, minutes: 10 }),
  chore("dust-skirting", "Dust the skirting boards", "Obriši prašinu s lajsni", "whole", { every: 30, minutes: 20 }),
  chore("cobwebs", "Remove the cobwebs", "Ukloni paučinu", "whole", { every: 30, minutes: 10 }),
  chore("dust-radiators", "Dust the radiators", "Obriši prašinu s radijatora", "whole", { every: 30, minutes: 10 }),
  chore("aircon-filters", "Clean the air conditioning filters", "Očisti filtre klima uređaja", "whole", { every: 90, minutes: 20 }),
  chore("clean-vacuum", "Empty and clean the vacuum cleaner", "Isprazni i očisti usisavač", "whole", { every: 14, minutes: 5 }),
  chore("declutter-drawer", "Clear out one drawer", "Raščisti jednu ladicu", "whole", { every: 14, minutes: 15 }),
];

export const LIBRARY_SUPPLIES: LibrarySupply[] = [
  // Kitchen
  supply("washing-up-liquid", "Washing-up liquid", "Deterdžent za posuđe", KITCHEN),
  supply("dishwasher-tablets", "Dishwasher tablets", "Tablete za perilicu posuđa", { fixtures: ["dishwasher"] }),
  supply("dishwasher-salt", "Dishwasher salt", "Sol za perilicu posuđa", { fixtures: ["dishwasher"] }),
  supply("rinse-aid", "Rinse aid", "Sjajilo za perilicu posuđa", { fixtures: ["dishwasher"] }),
  supply("sponges", "Sponges", "Spužvice", KITCHEN),
  supply("bin-bags", "Bin bags", "Vrećice za smeće", KITCHEN),
  supply("kitchen-roll", "Kitchen roll", "Papirnati ručnici", KITCHEN),
  supply("foil", "Aluminium foil", "Aluminijska folija", KITCHEN),
  supply("baking-paper", "Baking paper", "Papir za pečenje", { fixtures: ["oven"] }),
  supply("degreaser", "Kitchen degreaser", "Odmašćivač", { fixtures: ["hob", "oven"] }),
  supply("rubber-gloves", "Rubber gloves", "Gumene rukavice", KITCHEN),

  // Bathroom and toilet
  supply("toilet-paper", "Toilet paper", "Toaletni papir", { rooms: ["toilet"], fixtures: ["toilet"] }),
  supply("toilet-cleaner", "Toilet cleaner", "Sredstvo za čišćenje WC-a", { rooms: ["toilet"], fixtures: ["toilet"] }),
  supply("bathroom-cleaner", "Bathroom cleaner", "Sredstvo za čišćenje kupaonice", BATH),
  supply("limescale-remover", "Limescale remover", "Sredstvo protiv kamenca", { fixtures: ["shower", "bathtub"] }),
  supply("bleach", "Bleach", "Varikina", BATH),
  supply("hand-soap", "Hand soap", "Tekući sapun", BATH),
  supply("shampoo", "Shampoo", "Šampon", { fixtures: ["shower", "bathtub"] }),
  supply("shower-gel", "Shower gel", "Gel za tuširanje", { fixtures: ["shower", "bathtub"] }),
  supply("toothpaste", "Toothpaste", "Pasta za zube", { rooms: ["bathroom"] }),
  supply("glass-cleaner", "Glass cleaner", "Sredstvo za čišćenje stakla", { rooms: ["bathroom"] }),

  // Laundry
  supply("laundry-detergent", "Laundry detergent", "Deterdžent za rublje", WASHER),
  supply("fabric-softener", "Fabric softener", "Omekšivač", WASHER),
  supply("stain-remover", "Stain remover", "Sredstvo za uklanjanje mrlja", WASHER),

  // Terrace
  supply("plant-food", "Plant food", "Prihrana za biljke", { rooms: ["terrace"] }),

  // Whole home
  supply("all-purpose-cleaner", "All-purpose cleaner", "Univerzalno sredstvo za čišćenje", "whole"),
  supply("floor-cleaner", "Floor cleaner", "Sredstvo za čišćenje podova", "whole"),
  supply("microfibre-cloths", "Microfibre cloths", "Krpe od mikrovlakana", "whole"),
  supply("vacuum-bags", "Vacuum cleaner bags", "Vrećice za usisavač", "whole"),
  supply("light-bulbs", "Light bulbs", "Žarulje", "whole"),
  supply("batteries", "Batteries", "Baterije", "whole"),
  supply("tissues", "Tissues", "Papirnate maramice", "whole"),
];
