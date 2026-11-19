# SPEC: Gateway Arch Generator

## 1\. What it is

I want to build a parametric tool for the gateway building in my Urban Design Studio commercial block. The gateway connects the main shopping street to the courtyard behind it. Instead of remodeling the whole building whenever I change an arch, I want to adjust its floors, openings, depth, and roof in one tool, and compare the results in 3D and architectural views.

## 2\. Who it's for

The tool is for architecture students and designers, including me, who want to test several gateway designs quickly. The building is for people walking from the street into the courtyard. I want the entrance to be easy to recognize and comfortable to walk through, while the upper arches give the building its own character.

## 3\. Other courses

This is also part of another course: Urban Design Studio. I will follow that course's rules on AI use and disclosure when I use or present this work there.

## 4\. What can change (sliders and controls)

I do **not** want every floor to look the same. For example, I might use **one wide, tall arch on the ground floor** and **three smaller arches on the second floor**. The ground floor can be taller than the floor above it. I also want to adjust one arch without changing all the others.

|Slider|What it changes|From|To|Units|Why it matters to the design|
|-|-|-:|-:|-|-|
|Number of floors|Total number of levels|1|3|floors|Compare a simple entrance with a taller gateway building|
|Floor height (selected floor)|Height of each floor separately|10|24|ft|Make the main entrance taller without making every floor taller|
|Arch count (selected floor)|Number of arches on that floor|1|5|arches|Have one large arch below and several smaller arches above|
|Arch clear width (selected arch)|Width of one opening|4|26|ft|Make a central arch larger than the side arches|
|Arch clear height (selected arch)|Height from finished floor to arch crown|7|21|ft|Adjust scale and the clear passage height|
|Arch rise (selected arch)|Vertical rise from spring line to crown|1|8|ft|Change the curve without changing every other opening|
|Gateway depth|Front-to-back depth of the building/passage|8|30|ft|Compare a shallow gateway with a longer covered passage|
|Roof pitch|Slope of a pitched roof|10|35|degrees|Compare different roof proportions|
|Roof overhang|Distance the roof extends beyond the exterior wall|1|4|ft|Change the roof edge and amount of cover|

**Other controls:** I want a **Selected Floor** control and a **Selected Arch** control. Each floor saves its own height and arch count; each arch saves its own width, clear height, and rise. Changing Arch 2 should not automatically resize Arch 1. For the first version, selecting an arch from a menu is enough. Clicking an arch directly in the 3D model would be a later improvement.

The **Roof Type** control will start with **Flat** and **Gable**. A simple **Upper-Level Railing** on/off control is an optional detail if the main geometry works. A hip roof and entrance steps can be added later. If there are too many arches or one becomes too large, the tool should give a warning rather than stretch the whole building or let openings overlap.

## 5\. What stays fixed

* The project is **one gateway building**, not a generator for the entire commercial block. Its front faces the commercial street; the passage leads toward the courtyard.
* For the first model, I will use a **44 ft-wide facade** as a **temporary study dimension**, not a measurement from my CAD. I will check this against the studio plan later. Changing an arch does not change this overall width.
* I will reserve **2 ft of solid wall/pier** at each facade edge and between adjacent arches, and **1 ft for the slab/band between levels**. These are modeling assumptions, not structural calculations.
* Arches use a simple symmetric curved profile. Different floors can have different layouts, and arches on one floor do **not** have to line up with the arches below.
* The roof stays above the highest floor. I will keep the preview materials simple and neutral rather than making a material selector now. I may use a stucco-like wall and tile-roof appearance later.
* All dimensions are in feet. The 3D, top, front, and side views come from the **same geometry**, rather than being drawn as unrelated images.

## 6\. What must stay true (rules and warnings)

1. **People rule.** At least one ground-floor arch on the route from the street to the courtyard must have at least 10 ft of clear width and 10 ft of clear height. If there is no opening this size, the tool warns me. This is my design target, not proof of ADA or building-code compliance.
2. **The arches must fit the facade.** On each floor, total clear arch widths + 2 ft × (arch count + 1) must be no more than 44 ft. This keeps the openings and the minimum piers inside the study facade. If I widen one arch too much, the tool warns me instead of silently shrinking the others.
3. **Openings must fit their own floors.** Each arch's clear height must be no more than that floor's height minus 1 ft. Also, arch rise must be less than clear arch height, so the spring line stays above the floor. A 10 ft-high ground floor cannot hold a 10 ft-clear main arch under this rule; that combination should show a warning.
4. **Side passages should not become unusably narrow.** If a ground-floor side arch is intended as a walking route, its clear width must be at least 5 ft. A narrower opening gets a warning and is not counted as a usable route.
5. **Keep the top of the building clear.** The roof must sit above the highest level and must not intersect an arch opening. If the optional upper-level railing is added, it must not cut through an arch or the roof. This is a geometry check, not a structural or guardrail safety check.

I want the warnings to help me see when a design choice creates a problem, rather than automatically changing the design without telling me.

## 7\. What a good variation looks like

I want to compare designs that feel genuinely different: a one-story entrance, a two-story gateway with one big arch below three smaller ones, and perhaps a three-story version. A good variation has a clear main passage, interesting but organized proportions, and a roof that works with the arches. I would compare at least six options and choose one based on both the entrance experience and the building's appearance, not just the number of arches.

## 8\. Who it does not serve

The tool does not yet fully serve wheelchair users or other people who need a verified accessible route. An arch can meet my width and height targets while the route still has steps, an uneven surface, or no accessible way to reach an upper floor. My tool does not check ramps, turning areas, elevators, or every accessibility requirement. I want to be clear about that limit instead of calling a design accessible just because the opening is large enough. It also does not serve a contractor or engineer who needs structural calculations and construction-ready drawings.

## 9\. What my tool will NOT do

I am focusing on the arch building, not shops, full floor layouts, or the whole commercial block. The first working version should generate the arches, their floor-by-floor differences, building depth, and a simple roof, with the starter's 3D, top, front, and side views. These standard views are useful for studying the design, but a top view is not automatically a cut floor plan, and a side view is not a section cut.

I would like to add simplified plan and section cuts from the same model as a next step, because my longer-term interest is a tool that helps architects produce drawings more quickly. Detailed CAD line weights, full construction drawings, realistic rendering, sun/shadow analysis, 3D topography, and automatic drawing generation from any uploaded building are outside this first version.

## 10\. References and context

My references are my Urban Design Studio commercial block CAD plan and my axonometric study of the gateway building. That study has a large lower opening, smaller upper arches, a roof, and details like railings and stairs. I want to keep its general idea but make the arch arrangements editable rather than copy every detail. I may also import a simplified Rhino OBJ as gray background context; it will not automatically become editable generator geometry.

## 11\. Print plan

I may 3D print a chosen version for the November 19 presentation, but I have not selected a scale yet. I would first check the model size and whether the arches, piers, and roof can be printed clearly. A physical print is not part of the November 5 SPEC checkpoint.

