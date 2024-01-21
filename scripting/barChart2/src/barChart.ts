import "./../style/visual.less";
import {
    select as d3Select,
    Selection as d3Selection,
    BaseType
} from "d3-selection";
import {
    scaleLinear,
    ScaleLinear,
    scaleBand
} from "d3-scale";

import { axisBottom } from "d3-axis";

import powerbiVisualsApi from "powerbi-visuals-api";
import powerbi = powerbiVisualsApi;

type Selection<T1, T2 = T1> = d3.Selection<any, T1, any, T2>;

import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import DataViewObjects = powerbi.DataViewObjects;
import Fill = powerbi.Fill;
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;
import ISelectionId = powerbi.visuals.ISelectionId;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import IVisual = powerbi.extensibility.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import PrimitiveValue = powerbi.PrimitiveValue;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

import { createTooltipServiceWrapper, ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";
import { textMeasurementService, valueFormatter } from "powerbi-visuals-utils-formattingutils";

import { dataViewWildcard } from "powerbi-visuals-utils-dataviewutils";
import { getLocalizedString } from "./localization/localizationHelper"
import { getCategoricalObjectValue, getValue } from "./objectEnumerationUtility";

/**
 * Interface for BarCharts viewmodel.
 *
 * @interface
 * @property {BarChartDataPoint[]} dataPoints - Set of data points the visual will render.
 * @property {number} dataMax                 - Maximum data value in the set of data points.
 */
interface BarChartViewModel {
    dataPoints: BarChartDataPoint[];
    dataMax: number;
    settings: BarChartSettings;
}

/**
 * Interface for BarChart data points.
 *
 * @interface
 * @property {number} value             - Data value for point.
 * @property {string} category          - Corresponding category of data value.
 * @property {string} color             - Color corresponding to data point.
 * @property {ISelectionId} selectionId - Id assigned to data point for cross filtering
 *                                        and visual interaction.
 */
interface BarChartDataPoint {
    value: PrimitiveValue;
    category: string;
    color: string;
    strokeColor: string;
    strokeWidth: number;
    selectionId: ISelectionId;
    fill: string; // Add fill property for image color
    stroke: string; // Add stroke property for image border color
}


/**
 * Interface for BarChart settings.
 *
 * @interface
 * @property {{show:boolean}} enableAxis - Object property that allows axis to be enabled.
 * @property {{chosenTime:string}}
*/
interface BarChartSettings {
    enableAxis: {
        show: boolean;
        fill: string;
    };
    timeOfDay: {
        chosenTime: string;
    }
}

let defaultSettings: BarChartSettings = {
    enableAxis: {
        show: false,
        fill: "#000000",
    },
    timeOfDay: {
        chosenTime: "Day"
    }
}

// At the top of your file, define the opacity levels
const SELECTED_OPACITY = 1; // Fully opaque for selected bars
const UNSELECTED_OPACITY = 0.5; // Semi-transparent for non-selected bars


/**
 * Function that converts queried data into a viewmodel that will be used by the visual.
 *
 * @function
 * @param {VisualUpdateOptions} options - Contains references to the size of the container
 *                                        and the dataView which contains all the data
 *                                        the visual had queried.
 * @param {IVisualHost} host            - Contains references to the host which contains services
 */
function visualTransform(options: VisualUpdateOptions, host: IVisualHost): BarChartViewModel {
    let dataViews = options.dataViews;
    let viewModel: BarChartViewModel = {
        dataPoints: [],
        dataMax: 0,
        settings: <BarChartSettings>{}
    };

    if (!dataViews
        || !dataViews[0]
        || !dataViews[0].categorical
        || !dataViews[0].categorical.categories
        || !dataViews[0].categorical.categories[0].source
        || !dataViews[0].categorical.values
    ) {
        return viewModel;
    }

    let categorical = dataViews[0].categorical;
    let category = categorical.categories[0];
    let dataValue = categorical.values[0];

    let barChartDataPoints: BarChartDataPoint[] = [];
    let dataMax: number;

    let colorPalette: ISandboxExtendedColorPalette = host.colorPalette;
    let objects = dataViews[0].metadata.objects;

    const strokeColor: string = getColumnStrokeColor(colorPalette);

    let barChartSettings: BarChartSettings = {
        enableAxis: {
            show: getValue<boolean>(objects, 'enableAxis', 'show', defaultSettings.enableAxis.show),
            fill: getAxisTextFillColor(objects, colorPalette, defaultSettings.enableAxis.fill),
        },
        timeOfDay: {
            chosenTime: getValue<string>(objects, 'timeOfDay', 'chosenTime', defaultSettings.timeOfDay.chosenTime) // Get Time of Day setting value
        }
    };

    const strokeWidth: number = getColumnStrokeWidth(colorPalette.isHighContrast);

    for (let i = 0, len = Math.max(category.values.length, dataValue.values.length); i < len; i++) {
        const color: string = getColumnColorByIndex(category, i, colorPalette);

        const selectionId: ISelectionId = host.createSelectionIdBuilder()
            .withCategory(category, i)
            .createSelectionId();

        // Inside the for loop where you create barChartDataPoints
        barChartDataPoints.push({
            color,
            strokeColor: getColumnStrokeColor(colorPalette),
            strokeWidth,
            selectionId,
            value: dataValue.values[i],
            category: `${category.values[i]}`,
            fill: color, // Set fill color for the image
            stroke: getColumnStrokeColor(colorPalette) // Set stroke color for the image border
        });
    }

    dataMax = <number>dataValue.maxLocal;

    return {
        dataPoints: barChartDataPoints,
        dataMax: dataMax,
        settings: barChartSettings,
    };
}


function getColumnColorByIndex(
    category: DataViewCategoryColumn,
    index: number,
    colorPalette: ISandboxExtendedColorPalette,
): string {
    if (colorPalette.isHighContrast) {
        return colorPalette.background.value;
    }

    const defaultColor: Fill = {
        solid: {
            color: colorPalette.getColor(`${category.values[index]}`).value,
        }
    };

    return getCategoricalObjectValue<Fill>(
        category,
        index,
        'colorSelector',
        'fill',
        defaultColor
    ).solid.color;
}

function getColumnStrokeColor(colorPalette: ISandboxExtendedColorPalette): string {
    return colorPalette.isHighContrast
        ? colorPalette.foreground.value
        : null;
}

function getColumnStrokeWidth(isHighContrast: boolean): number {
    return isHighContrast
        ? 2
        : 0;
}

function getAxisTextFillColor(
    objects: DataViewObjects,
    colorPalette: ISandboxExtendedColorPalette,
    defaultColor: string
): string {
    if (colorPalette.isHighContrast) {
        return colorPalette.foreground.value;
    }

    return getValue<Fill>(
        objects,
        "enableAxis",
        "fill",
        {
            solid: {
                color: defaultColor,
            }
        },
    ).solid.color;
}

export class BarChart implements IVisual {
    private svg: Selection<any>;
    private host: IVisualHost;
    private locale: string;
    private barContainer: Selection<SVGElement>;
    private xAxis: Selection<SVGElement>;
    private barDataPoints: BarChartDataPoint[];
    private barChartSettings: BarChartSettings;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private selectionManager: ISelectionManager;
    private helpLinkElement: Selection<any>;
    private element: HTMLElement;
    private isLandingPageOn: boolean;
    private LandingPageRemoved: boolean;
    private LandingPage: Selection<any>;
    private averageLine: Selection<SVGElement>;

    private barSelection: d3.Selection<d3.BaseType, any, d3.BaseType, any>;



    static Config = {
        xScalePadding: 0.1,
        solidOpacity: 1,
        transparentOpacity: 1,
        margins: {
            top: 0,
            right: 0,
            bottom: 25,
            left: 30,
        },
        xAxisFontMultiplier: 0.04,
    };

    /**
     * Creates instance of BarChart. This method is only called once.
     *
     * @constructor
     * @param {VisualConstructorOptions} options - Contains references to the element that will
     *                                             contain the visual and a reference to the host
     *                                             which contains services.
     */
    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.element = options.element;
        this.selectionManager = options.host.createSelectionManager();
        this.locale = options.host.locale;

        this.selectionManager.registerOnSelectCallback(() => {
            this.syncSelectionState(this.barSelection, <ISelectionId[]>this.selectionManager.getSelectionIds());
        });

        this.svg = d3Select(options.element)
            .append('svg')
            .classed('barChart', true);

        this.barContainer = this.svg
            .append('g')
            .classed('barContainer', true);

        this.xAxis = this.svg
            .append('g')
            .classed('xAxis', true);

        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);


        
    }



    /**
     * Updates the state of the visual. Every sequential databinding and resize will call update.
     *
     * @function
     * @param {VisualUpdateOptions} options - Contains references to the size of the container
     *                                        and the dataView which contains all the data
     *                                        the visual had queried.
     */
    public update(options: VisualUpdateOptions) {
        let viewModel: BarChartViewModel = visualTransform(options, this.host);
        let settings = this.barChartSettings = viewModel.settings;
        this.barDataPoints = viewModel.dataPoints;
    
        let timeOfDaySetting = this.barChartSettings.timeOfDay.chosenTime;


        let selectedScraper = "https://kameronyork.com/docs/assets/superskyscraper.png";
        let selectedBackground = "https://kameronyork.com/docs/assets/just-clouds.png";
        let backgroundColor;

        if (timeOfDaySetting === "Day") {
            selectedBackground = "https://kameronyork.com/docs/assets/just-clouds.png";
            selectedScraper = "https://kameronyork.com/docs/assets/superskyscraper.png";
            backgroundColor = "skyblue";
        } else if (timeOfDaySetting === "Night") {
            selectedBackground = "https://kameronyork.com/docs/assets/starry-sky.png";
            selectedScraper = "https://kameronyork.com/docs/assets/gold-scraper.png";
            backgroundColor = "black";
        } else if (timeOfDaySetting === "Snowy") {
            selectedBackground = "https://kameronyork.com/docs/assets/just-clouds.png";
            selectedScraper = "https://kameronyork.com/docs/assets/superskyscraper.png";
            backgroundColor = "grey";
        } else {
            // Default color if timeOfDaySetting is not recognized
            selectedBackground = "https://kameronyork.com/docs/assets/just-clouds.png"; 
            selectedScraper = "https://kameronyork.com/docs/assets/superskyscraper.png";
            backgroundColor = "grey";  
        }

        
        // Set the background color of the SVG element
        this.svg.style("background-color", backgroundColor);
        
        console.log("TimeOfDay: ", timeOfDaySetting);
    
        let width = options.viewport.width;
        let height = options.viewport.height;
    
        this.svg
            .attr("width", width)
            .attr("height", height);
    
        // Add an image element for the background
        let backgroundImage = this.svg.select("image.background-image");
        if (backgroundImage.empty()) {
            backgroundImage = this.svg.insert("image", ":first-child")
                .classed("background-image", true);
        }
    
        // Update the attributes of the background image
        backgroundImage
            .attr("xlink:href", selectedBackground)
            .attr("width", width)
            .attr("height", height)
            .attr("x", 0) // Align the left edge of the image with the left edge of the visual
            .attr("y", 0) // Align the top edge of the image with the top edge of the visual
            .attr("preserveAspectRatio", "none"); // Allow the image to stretch to fit the visual
    
        if (settings.enableAxis.show) {
            let margins = BarChart.Config.margins;
            height -= margins.bottom;
        }

        this.xAxis
            .style("font-size", Math.min(height, width) * BarChart.Config.xAxisFontMultiplier)
            .style("fill", settings.enableAxis.fill);
    
        let yScale = scaleLinear()
            .domain([0, viewModel.dataMax])
            .range([height, 0]);
    
        let xScale = scaleBand()
            .domain(viewModel.dataPoints.map(d => d.category))
            .rangeRound([0, width])
            .padding(0.2);
    
        let xAxis = axisBottom(xScale);
    
        const colorObjects = options.dataViews[0] ? options.dataViews[0].metadata.objects : null;
        this.xAxis.attr('transform', 'translate(0, ' + height + ')')
            .call(xAxis)
            .attr("color", getAxisTextFillColor(
                colorObjects,
                this.host.colorPalette,
                defaultSettings.enableAxis.fill
            ));
    
        const textNodes = this.xAxis.selectAll("text");
        BarChart.wordBreak(textNodes, xScale.bandwidth(), height);
    
        // Add skyscraper images after the background image
        this.barSelection = this.barContainer
            .selectAll('.bar')
            .data(this.barDataPoints);
    
        const barSelectionMerged = this.barSelection
            .enter()
            .append('image')
            .merge(<any>this.barSelection);
    
        barSelectionMerged.classed('bar', true);
    
        barSelectionMerged
            .attr("width", xScale.bandwidth())
            .attr("height", d => height - yScale(<number>d.value))
            .attr("y", d => yScale(<number>d.value)) // Set the y position based on the scaled value
            .attr("x", d => xScale(d.category))
            .attr("href", selectedScraper) // Set all images to the same URL
            .attr("preserveAspectRatio", "xMinYMin slice") // Preserve the aspect ratio and position the image at the top left of the container
            .style("image-rendering", "auto"); // Set the image-rendering property to auto

        this.tooltipServiceWrapper.addTooltip(barSelectionMerged,
            (datapoint: BarChartDataPoint) => this.getTooltipData(datapoint),
            (datapoint: BarChartDataPoint) => datapoint.selectionId
        );
    
        this.syncSelectionState(
            barSelectionMerged,
            <ISelectionId[]>this.selectionManager.getSelectionIds()
        );

        barSelectionMerged.on('click', (event: Event, datum: BarChartDataPoint) => {
            console.log("Bar clicked"); // Add for debugging
            if (this.host.hostCapabilities.allowInteractions) {
                const isCtrlPressed: boolean = (<MouseEvent>event).ctrlKey;
    
                this.selectionManager
                    .select(datum.selectionId, isCtrlPressed)
                    .then((ids: ISelectionId[]) => {
                        console.log("Selection updated", ids); // Add for debugging
                        this.syncSelectionState(barSelectionMerged, ids);
                    });
                event.stopPropagation();
            }
        });

        this.barSelection
            .exit()
            .remove();
        this.handleClick(barSelectionMerged);
    }
    


    private static wordBreak(
        textNodes: Selection<any, SVGElement>,
        allowedWidth: number,
        maxHeight: number
    ) {
        textNodes.each(function () {
            textMeasurementService.wordBreak(
                this,
                allowedWidth,
                maxHeight);
        });
    }


    private handleClick(barSelection: Selection<any>) {
        // Clear selection when clicking outside a bar
        this.svg.on('click', () => {
            if (this.host.hostCapabilities.allowInteractions) {
                this.selectionManager
                    .clear()
                    .then(() => {
                        this.syncSelectionState(barSelection, []);
                    });
            }
        });
    }

    private handleContextMenu() {
        this.svg.on('contextmenu', (event) => {
            const mouseEvent: MouseEvent = event;
            const eventTarget: EventTarget = mouseEvent.target;
            const dataPoint: any = d3Select(<BaseType>eventTarget).datum();
            this.selectionManager.showContextMenu(dataPoint ? dataPoint.selectionId : {}, {
                x: mouseEvent.clientX,
                y: mouseEvent.clientY
            });
            mouseEvent.preventDefault();
        });
    }

    private syncSelectionState(
        selection: Selection<BarChartDataPoint>,
        selectionIds: ISelectionId[]
    ): void {
        if (!selection) {
            return;
        }
    
        // If no selection is made, all bars should be fully opaque
        if (!selectionIds || selectionIds.length === 0) {
            selection.style("opacity", SELECTED_OPACITY);
            return;
        }
    
        // Apply different opacity based on whether the bar is selected or not
        selection.each(function (barDataPoint: BarChartDataPoint) {
            const isSelected: boolean = selectionIds.some((id) => id.includes(barDataPoint.selectionId));
    
            d3Select(this).style("opacity", isSelected ? SELECTED_OPACITY : UNSELECTED_OPACITY);
        });
    }
    

    private isSelectionIdInArray(selectionIds: ISelectionId[], selectionId: ISelectionId): boolean {
        if (!selectionIds || !selectionId) {
            return false;
        }

        return selectionIds.some((currentSelectionId: ISelectionId) => {
            return currentSelectionId.includes(selectionId);
        });
    }


    private getTooltipData(value: any): VisualTooltipDataItem[] {
        const formattedValue = valueFormatter.format(value.value, value.format);
        return [{
            displayName: value.category,
            value: formattedValue
        }];
    }

    

    public getFormattingModel(): powerbi.visuals.FormattingModel {  
        // Define the dataCard FormattingCard with the display units and time of day dropdowns
        const dataCard: powerbi.visuals.FormattingCard = {
            description: "Change the Time of Day",
            displayName: "Visual Style",
            uid: "dataCard_uid",
            groups: [{
                displayName: undefined,
                uid: "dataCard_group1_uid",
                slices: [
                    {
                        uid: "dataCard_timeOfDay_uid", // UID for the time of day dropdown
                        displayName: "Time of Day",
                        control: {
                            type: powerbi.visuals.FormattingComponent.Dropdown,
                            properties: {
                                descriptor: {
                                    objectName: "timeOfDay",
                                    propertyName: "chosenTime"
                                },
                                value: this.barChartSettings.timeOfDay.chosenTime
                            }
                        }
                    }
                ],
            }]
        };
    
        // Define the enableAxisCard FormattingCard (similar to the original)
        const enableAxisCard: powerbi.visuals.FormattingCard = {
            displayName: "Enable Axis",
            uid: "enableAxisCard_uid",
            topLevelToggle: {
                uid: "enableAxisCard_topLevelToggle_showToggleSwitch_uid",
                suppressDisplayName: true,
                control: {
                    type: powerbi.visuals.FormattingComponent.ToggleSwitch,
                    properties: {
                        descriptor: {
                            objectName: "enableAxis",
                            propertyName: "show"
                        },
                        value: this.barChartSettings.enableAxis.show
                    }
                }
            },
            groups: [{
                displayName: undefined,
                uid: "enableAxisCard_group1_uid",
                slices: [
                    {
                        uid: "enableAxisCard_group1_fill_uid",
                        displayName: "Color",
                        control: {
                            type: powerbi.visuals.FormattingComponent.ColorPicker,
                            properties: {
                                descriptor: {
                                    objectName: "enableAxis",
                                    propertyName: "fill"
                                },
                                value: { value: this.barChartSettings.enableAxis.fill }
                            }
                        }
                    }
                ],
            }],
            revertToDefaultDescriptors: [
                {
                    objectName: "enableAxis",
                    propertyName: "show"
                },
                {
                    objectName: "enableAxis",
                    propertyName: "fill"
                }
            ]
        };
        
        // Define the formattingModel with all the cards
        const formattingModel: powerbi.visuals.FormattingModel = {
            cards: [enableAxisCard, dataCard] // Add timeOfDayCard
        };

        return formattingModel;
    }   

}