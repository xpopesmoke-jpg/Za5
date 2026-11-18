import type { LibraryChore, LibrarySupply, Where } from "./library";

/*
 * Za5's starter library: the Chores and Supplies suggested when a home is set up. Every entry is in English and
 * Croatian. Chores use the imperative ("Clean the toilet" / "Očisti WC školjku"), the way people say them to
 * each other. Schedules count days from the last completion; Effort is a realistic estimate in minutes.
 */

const chore = (key: string, en: string, hr: string, where: Where, everyDays: number, effort: number): LibraryChore => ({
  key,
  text: { en, hr },
  where,
  schedule: { kind: "every", days: everyDays },
  effort,
});

const supply = (key: string, en: string, hr: string, where: Where): LibrarySupply => ({ key, text: { en, hr }, where });

// A Room counts as a kitchen when it is one, or when it has kitchen-only Fixtures ("Living + kitchen").
const KITCHEN: Where = { rooms: ["kitchen"], fixtures: ["hob", "oven", "fridge", "dishwasher"] };
const BATH: Where = { rooms: ["bathroom", "toilet"] };
const SLEEP: Where = { rooms: ["bedroom", "kids"] };
const DRY_FLOORS: Where = { rooms: ["bedroom", "kids", "living", "dining", "office", "hall"] };
const LAUNDRY: Where = { rooms: ["laundry"], fixtures: ["washing_machine"] };

export const LIBRARY_CHORES: LibraryChore[] = [
  // Kitchen
  chore("wash-dishes", "Wash the dishes", "Operi suđe", KITCHEN, 1, 15),
  chore("run-dishwasher", "Run the dishwasher", "Uključi perilicu suđa", { fixtures: ["dishwasher"] }, 1, 5),
  chore("empty-dishwasher", "Empty the dishwasher", "Isprazni perilicu suđa", { fixtures: ["dishwasher"] }, 1, 5),
  chore("dishwasher-filter", "Clean the dishwasher filter", "Očisti filter perilice suđa", { fixtures: ["dishwasher"] }, 30, 10),
  chore("wipe-counters", "Wipe the counters", "Obriši radne plohe", { ...KITCHEN, fixtures: ["hob", "oven", "fridge", "dishwasher", "counter"] }, 1, 5),
  chore("clean-hob", "Clean the hob", "Očisti ploču za kuhanje", { fixtures: ["hob"] }, 3, 10),
  chore("extractor-filter", "Clean the extractor hood filter", "Očisti filter nape", { fixtures: ["hob"] }, 60, 15),
  chore("clean-oven", "Clean the oven", "Očisti pećnicu", { fixtures: ["oven"] }, 30, 40),
  chore("clean-microwave", "Clean the microwave", "Očisti mikrovalnu pećnicu", KITCHEN, 14, 10),
  chore("fridge-clear-out", "Throw out old food from the fridge", "Izbaci staru hranu iz hladnjaka", { fixtures: ["fridge"] }, 7, 10),
  chore("clean-fridge", "Clean the inside of the fridge", "Očisti hladnjak iznutra", { fixtures: ["fridge"] }, 30, 30),
  chore("defrost-freezer", "Defrost the freezer", "Odledi zamrzivač", { fixtures: ["fridge"] }, 180, 45),
  chore("kitchen-sink", "Scrub the kitchen sink", "Izribaj sudoper", KITCHEN, 7, 5),
  chore("mop-kitchen", "Mop the kitchen floor", "Obriši pod u kuhinji", KITCHEN, 7, 15),
  chore("take-out-bins", "Take out the bins", "Iznesi smeće", KITCHEN, 2, 5),
  chore("take-out-recycling", "Take out the recycling", "Iznesi otpad za reciklažu", KITCHEN, 7, 5),
  chore("wipe-cabinets", "Wipe the cupboard doors", "Obriši vrata kuhinjskih ormarića", KITCHEN, 30, 15),
  chore("descale-kettle", "Descale the kettle", "Očisti kamenac iz kuhala za vodu", KITCHEN, 30, 5),
  chore("descale-coffee", "Descale the coffee machine", "Očisti kamenac iz aparata za kavu", KITCHEN, 60, 10),
  chore("tidy-pantry", "Tidy the food cupboard and check dates", "Pospremi smočnicu i provjeri rokove", KITCHEN, 60, 20),
  chore("wipe-table", "Wipe the dining table", "Obriši stol za jelo", { rooms: ["dining", "kitchen"] }, 1, 2),

  // Bathroom and toilet
  chore("clean-toilet", "Clean the toilet", "Očisti WC školjku", { rooms: ["toilet"], fixtures: ["toilet"] }, 7, 10),
  chore("toilet-brush", "Clean the toilet brush", "Očisti četku za WC", { rooms: ["toilet"], fixtures: ["toilet"] }, 30, 5),
  chore("bathroom-sink", "Clean the basin and taps", "Očisti umivaonik i slavine", BATH, 7, 5),
  chore("wipe-mirror", "Wipe the mirror", "Obriši ogledalo", BATH, 7, 5),
  chore("clean-shower", "Clean the shower", "Očisti tuš", { fixtures: ["shower"] }, 7, 15),
  chore("clean-bathtub", "Clean the bathtub", "Očisti kadu", { fixtures: ["bathtub"] }, 7, 15),
  chore("shower-glass", "Wash the shower curtain or wipe the glass", "Operi zavjesu za tuš ili obriši staklo", { fixtures: ["shower", "bathtub"] }, 30, 10),
  chore("descale-shower", "Descale the shower head and taps", "Očisti kamenac s tuša i slavina", { fixtures: ["shower", "bathtub"] }, 30, 15),
  chore("clear-drains", "Clear the drains", "Očisti odvode", { fixtures: ["shower", "bathtub"] }, 30, 10),
  chore("scrub-grout", "Scrub the tile grout", "Izribaj fuge na pločicama", { rooms: ["bathroom"] }, 60, 30),
  chore("mop-bathroom", "Mop the bathroom floor", "Obriši pod u kupaonici", BATH, 7, 10),
  chore("change-towels", "Change the towels", "Promijeni ručnike", { rooms: ["bathroom"] }, 4, 5),
  chore("wash-bath-mat", "Wash the bath mat", "Operi prostirku za kupaonicu", { rooms: ["bathroom"] }, 14, 5),
  chore("empty-bathroom-bin", "Empty the bathroom bin", "Isprazni kantu u kupaonici", BATH, 7, 2),

  // Bedrooms (the children's room shares the bed Chores)
  chore("change-sheets", "Change the bed sheets", "Promijeni posteljinu", SLEEP, 7, 15),
  chore("air-room", "Air the room", "Prozrači sobu", SLEEP, 1, 2),
  chore("turn-mattress", "Turn the mattress", "Okreni madrac", SLEEP, 90, 10),
  chore("wash-duvet", "Wash the pillows and duvet", "Operi jastuke i poplun", SLEEP, 180, 20),
  chore("vacuum-under-bed", "Vacuum under the bed", "Usisaj ispod kreveta", SLEEP, 30, 10),
  chore("tidy-wardrobe", "Tidy the wardrobe", "Pospremi ormar", { rooms: ["bedroom"] }, 30, 20),

  // Floors and dust in the dry rooms
  chore("vacuum-floor", "Vacuum the floor", "Usisaj pod", DRY_FLOORS, 7, 15),
  chore("dust-surfaces", "Dust the surfaces", "Obriši prašinu", { rooms: ["bedroom", "kids", "living", "dining", "office"] }, 7, 10),

  // Children's room
  chore("tidy-toys", "Tidy the toys", "Pospremi igračke", { rooms: ["kids"] }, 1, 10),
  chore("wash-toys", "Wash the toys", "Operi igračke", { rooms: ["kids"] }, 30, 20),
  chore("sort-outgrown-clothes", "Sort out clothes that are too small", "Izdvoji odjeću koja je postala mala", { rooms: ["kids"] }, 90, 30),
  chore("clear-desk", "Clear the desk", "Pospremi radni stol", { rooms: ["kids", "office"] }, 7, 10),

  // Living room
  chore("tidy-living", "Tidy the living room", "Pospremi dnevni boravak", { rooms: ["living"] }, 1, 10),
  chore("vacuum-sofa", "Vacuum the sofa", "Usisaj kauč", { rooms: ["living"] }, 14, 10),
  chore("wash-cushion-covers", "Wash the cushion covers", "Operi navlake jastuka", { rooms: ["living"] }, 60, 15),
  chore("dust-tv", "Dust the TV and electronics", "Obriši prašinu s televizora i elektronike", { rooms: ["living"] }, 14, 5),
  chore("clean-rug", "Clean the rug", "Očisti tepih", { rooms: ["living"] }, 90, 30),

  // Hall
  chore("tidy-shoes", "Tidy the shoes", "Pospremi cipele", { rooms: ["hall"] }, 7, 5),
  chore("shake-doormat", "Shake out the doormat", "Istresi otirač", { rooms: ["hall"] }, 7, 5),
  chore("mop-hall", "Mop the hall floor", "Obriši pod u hodniku", { rooms: ["hall"] }, 7, 10),
  chore("sort-coats", "Sort the coats and bags", "Pospremi jakne i torbe", { rooms: ["hall"] }, 14, 10),
  chore("wipe-front-door", "Wipe the front door and handles", "Obriši ulazna vrata i kvake", { rooms: ["hall"] }, 30, 5),

  // Terrace or balcony
  chore("sweep-terrace", "Sweep the terrace", "Pometi terasu", { rooms: ["terrace"] }, 7, 15),
  chore("water-terrace-plants", "Water the terrace plants", "Zalij biljke na terasi", { rooms: ["terrace"] }, 2, 10),
  chore("wipe-outdoor-furniture", "Wipe the outdoor furniture", "Obriši vanjski namještaj", { rooms: ["terrace"] }, 30, 15),
  chore("wash-terrace", "Wash the terrace floor", "Operi pod terase", { rooms: ["terrace"] }, 30, 30),
  chore("terrace-drain", "Clear the terrace drain", "Očisti odvod na terasi", { rooms: ["terrace"] }, 60, 10),

  // Laundry (wherever the washing machine is)
  chore("do-laundry", "Do a load of laundry", "Operi rublje", LAUNDRY, 3, 10),
  chore("hang-laundry", "Hang up or dry the laundry", "Objesi ili osuši rublje", LAUNDRY, 3, 10),
  chore("fold-laundry", "Fold and put away the clothes", "Složi i pospremi odjeću", LAUNDRY, 3, 15),
  chore("ironing", "Do the ironing", "Izglačaj odjeću", LAUNDRY, 7, 30),
  chore("washer-cleaning-cycle", "Run a cleaning cycle on the washing machine", "Pokreni program čišćenja perilice rublja", { fixtures: ["washing_machine"] }, 30, 5),
  chore("washer-seal", "Wipe the washing machine seal and drawer", "Obriši gumu i ladicu perilice rublja", { fixtures: ["washing_machine"] }, 30, 10),
  chore("dryer-lint", "Empty the dryer's lint filter", "Očisti filter sušilice", { fixtures: ["dryer"] }, 3, 2),

  // Office and storage
  chore("empty-paper-bin", "Empty the paper bin", "Isprazni koš za papir", { rooms: ["office"] }, 7, 2),
  chore("wipe-keyboard", "Wipe the keyboard and screen", "Obriši tipkovnicu i ekran", { rooms: ["office"] }, 14, 5),
  chore("tidy-storage", "Tidy the storage room", "Pospremi spremište", { rooms: ["storage"] }, 60, 30),

  // Windows
  chore("clean-windows", "Clean the windows", "Operi prozore", { fixtures: ["window"] }, 30, 20),
  chore("wipe-sills", "Wipe the window sills", "Obriši prozorske daske", { fixtures: ["window"] }, 14, 5),

  // Whole home
  chore("water-plants", "Water the plants", "Zalij biljke", "whole", 3, 10),
  chore("pay-bills", "Pay the bills", "Plati račune", "whole", 30, 15),
  chore("weekly-shop", "Do the weekly shop", "Obavi tjednu kupnju", "whole", 7, 60),
  chore("plan-meals", "Plan the week's meals", "Isplaniraj obroke za tjedan", "whole", 7, 15),
  chore("sort-post", "Sort the post", "Razvrstaj poštu", "whole", 7, 5),
  chore("test-smoke-alarm", "Test the smoke alarm", "Provjeri alarm za dim", "whole", 30, 2),
  chore("wipe-switches", "Wipe the light switches and door handles", "Obriši prekidače i kvake", "whole", 14, 10),
  chore("dust-skirting", "Dust the skirting boards", "Obriši prašinu s lajsni", "whole", 30, 20),
  chore("cobwebs", "Remove the cobwebs", "Ukloni paučinu", "whole", 30, 10),
  chore("dust-radiators", "Dust the radiators", "Obriši prašinu s radijatora", "whole", 30, 10),
  chore("aircon-filters", "Clean the air conditioning filters", "Očisti filtere klima-uređaja", "whole", 90, 20),
  chore("clean-vacuum", "Empty and clean the vacuum cleaner", "Isprazni i očisti usisavač", "whole", 14, 5),
  chore("declutter-drawer", "Clear out one drawer", "Raščisti jednu ladicu", "whole", 14, 15),
];

export const LIBRARY_SUPPLIES: LibrarySupply[] = [
  // Kitchen
  supply("washing-up-liquid", "Washing-up liquid", "Deterdžent za suđe", KITCHEN),
  supply("dishwasher-tablets", "Dishwasher tablets", "Tablete za perilicu suđa", { fixtures: ["dishwasher"] }),
  supply("dishwasher-salt", "Dishwasher salt", "Sol za perilicu suđa", { fixtures: ["dishwasher"] }),
  supply("rinse-aid", "Rinse aid", "Sredstvo za ispiranje suđa", { fixtures: ["dishwasher"] }),
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
  supply("glass-cleaner", "Glass cleaner", "Sredstvo za staklo", { rooms: ["bathroom"], fixtures: ["window"] }),

  // Laundry
  supply("laundry-detergent", "Laundry detergent", "Deterdžent za rublje", LAUNDRY),
  supply("fabric-softener", "Fabric softener", "Omekšivač", LAUNDRY),
  supply("stain-remover", "Stain remover", "Sredstvo za uklanjanje mrlja", LAUNDRY),

  // Terrace
  supply("plant-food", "Plant food", "Prihrana za biljke", { rooms: ["terrace"] }),

  // Whole home
  supply("all-purpose-cleaner", "All-purpose cleaner", "Univerzalno sredstvo za čišćenje", "whole"),
  supply("floor-cleaner", "Floor cleaner", "Sredstvo za pod", "whole"),
  supply("microfibre-cloths", "Microfibre cloths", "Krpe od mikrovlakana", "whole"),
  supply("vacuum-bags", "Vacuum cleaner bags", "Vrećice za usisavač", "whole"),
  supply("light-bulbs", "Light bulbs", "Žarulje", "whole"),
  supply("batteries", "Batteries", "Baterije", "whole"),
  supply("tissues", "Tissues", "Papirnate maramice", "whole"),
];
