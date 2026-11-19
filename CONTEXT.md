# Za5: Home Chores

Za5 helps a household keep its home running: who does which chore, when, and which supplies need restocking, all placed on the household's own floor plan.

## People

**Household**:
The people who share one home and its chores, such as a couple or a small family.
_Avoid_: Family, team, group

**Member**:
A person who belongs to a Household and can claim and complete Chores; a person belongs to one Household.
_Avoid_: User (when talking about the household), participant

**Invite**:
A one-time link from the Owner that lets one person join the Household; it works once and runs out after 7 days.
_Avoid_: Invitation code, referral

**Former member**:
Someone who has left or been removed from a Household; their completed history stays and their Claims return to the pool.
_Avoid_: Deleted user, ex-member

**Owner**:
The Member who runs the Household: only the Owner edits the Home map and invites or removes Members. If the Owner leaves, the longest-standing Member becomes Owner.
_Avoid_: Admin, parent

## Home

**Plan**:
The floor-plan file a Household uploads (PDF or image), which the AI reads to build the Home map.
_Avoid_: Schematic, blueprint, drawing

**Home map**:
The household's home as a stylised 3D "dollhouse": rooms with raised walls and no roof, showing where Chores and Supplies are.
_Avoid_: Floor plan (that is the Plan), 3D model, visualization

**Floor**:
One level of the home; each page or image of a multi-floor Plan becomes one Floor.
_Avoid_: Level, storey

**Room**:
A named area of the home on the Home map, such as Kitchen or Bathroom, with a type and an outline.
_Avoid_: Space, area, zone

**Whole home**:
The place for Chores that belong to no single Room, such as watering all the plants or paying bills.
_Avoid_: General, misc, house

**Fixture**:
A fixed thing in a Room that Chores attach to, such as a shower, oven or toilet.
_Avoid_: Appliance (too narrow), furniture, object

## Work

**Chore**:
A repeating job in the home, such as "Clean bathroom, every week".
_Avoid_: Task, job, to-do

**Occurrence**:
One due instance of a Chore, such as "Clean bathroom, this Saturday"; it is what a Member claims and completes.
_Avoid_: Task, instance

**Walkthrough**:
The Owner's room-by-room pass through the home, Whole home last, keeping, changing or dropping the starter library's suggested Chores and adding ones it missed; it can be reopened for a Room later.
_Avoid_: Wizard, onboarding

**Routine**:
A named bundle of Chores done together, such as "Sunday reset".
_Avoid_: Checklist, program

**Claim**:
A Member taking an Occurrence from the open pool as theirs to do; it lapses at the end of the day the Occurrence was due (or, for an overdue one, at the end of the day it was claimed), and anyone may still complete it.
_Avoid_: Assign (assigning is done to someone, claiming is done by them)

**Za5**:
Postponing an Occurrence to later today or tomorrow, named after the app; it never counts against the Fairness balance.
_Avoid_: Snooze, skip, defer

**Skip**:
Dropping one Occurrence that isn't needed this time, without credit; the next Occurrence is scheduled as normal.
_Avoid_: Done (Skip is not completion), dismiss

**Away**:
A Household-wide pause, for example during a holiday, in which no Occurrence becomes overdue.
_Avoid_: Vacation mode, pause

**Effort**:
The estimated minutes a Chore takes; the unit of the Fairness balance.
_Avoid_: Points, score, difficulty

**Fairness balance**:
Each Member's completed Effort over the last 30 days, credited to whoever actually completed each Occurrence.
_Avoid_: Score, leaderboard

## Stock

**Supply**:
Something the Household uses up and restocks, such as bleach or toilet paper.
_Avoid_: Item, product, inventory

**Supply level**:
How much of a Supply is left: Full, Low or Out.
_Avoid_: Quantity, stock count

**Shopping list**:
The Household's shared list of Supplies to buy; Supplies at Low or Out land on it automatically.
_Avoid_: Grocery list, cart
