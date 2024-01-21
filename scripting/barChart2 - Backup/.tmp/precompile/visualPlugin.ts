import { BarChart } from "../../src/barChart";
import powerbiVisualsApi from "powerbi-visuals-api";
import IVisualPlugin = powerbiVisualsApi.visuals.plugins.IVisualPlugin;
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
import DialogConstructorOptions = powerbiVisualsApi.extensibility.visual.DialogConstructorOptions;
var powerbiKey: any = "powerbi";
var powerbi: any = window[powerbiKey];
var barChart2D1554CAED3B4FAA971478F87181AB79_DEBUG: IVisualPlugin = {
    name: 'barChart2D1554CAED3B4FAA971478F87181AB79_DEBUG',
    displayName: 'BarChart',
    class: 'BarChart',
    apiVersion: '5.3.0',
    create: (options?: VisualConstructorOptions) => {
        if (BarChart) {
            return new BarChart(options);
        }
        throw 'Visual instance not found';
    },
    createModalDialog: (dialogId: string, options: DialogConstructorOptions, initialState: object) => {
        const dialogRegistry = (<any>globalThis).dialogRegistry;
        if (dialogId in dialogRegistry) {
            new dialogRegistry[dialogId](options, initialState);
        }
    },
    custom: true
};
if (typeof powerbi !== "undefined") {
    powerbi.visuals = powerbi.visuals || {};
    powerbi.visuals.plugins = powerbi.visuals.plugins || {};
    powerbi.visuals.plugins["barChart2D1554CAED3B4FAA971478F87181AB79_DEBUG"] = barChart2D1554CAED3B4FAA971478F87181AB79_DEBUG;
}
export default barChart2D1554CAED3B4FAA971478F87181AB79_DEBUG;