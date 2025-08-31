<script setup lang="ts">
import type { Chart, GrowthStage, VolUnit } from "@/types/feedchart";
import type { NutrientTable } from "@/types/nutrients";
import { PieChart } from "echarts/charts";
import { LegendComponent, TitleComponent, TooltipComponent } from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import _ from "lodash";
import VChart, { THEME_KEY } from "vue-echarts";
import defaultdict from "defaultdict-proxy";

use([CanvasRenderer, PieChart, TitleComponent, TooltipComponent, LegendComponent]);

provide(THEME_KEY, "dark");

const all_charts: { [key: string]: Chart } = [
  (await import("@/assets/floranova.json")) as Chart,
  (await import("@/assets/maxiseries_indoor.json")) as Chart,
  (await import("@/assets/maxiseries_outdoor.json")) as Chart,
  (await import("@/assets/floraseries.json")) as Chart,
].reduce((obj, c) => ({ ...obj, [c.name]: c }), {});

const all_nutrients: NutrientTable = (await import("@/assets/nutrients.json"))
  .default as NutrientTable;

const chart = ref<string>(Object.keys(all_charts)[0]!);
const schedule = ref(default_schedule());
const stage = ref(default_stage());

function default_schedule(): string {
  return Object.keys(all_charts[chart.value]!.charts)[0]!;
}

function default_stage(): string {
  return Object.keys(all_charts[chart.value]!.charts[schedule.value]!)[0]!;
}

const target_amount = ref(1.0);
const target_unit = ref<VolUnit>("gal");
const units = ref<VolUnit[]>(["mL", "L", "fl oz", "gal"]);

function compute_nutrients(value_label = false) {
  const ch: Chart = all_charts[chart.value]!;
  const gs: GrowthStage = ch.charts[schedule.value]![stage.value]!;
  const target_gal = to_gal(target_amount.value, target_unit.value);

  const res: Array<object> = [];
  ch.nutrients.forEach((n) => {
    const amt = (gs[n.name] || 0) * target_gal;
    if (amt > 0) {
      res.push({
        name: n.name,
        value: _.round(amt, 3),
        itemStyle: {
          color: n.color,
        },
        label: {
          formatter: value_label ? `{c} ${n.unit}` : "{b}",
        },
        tooltip: {
          valueFormatter: (val: number) => `${val} ${n.unit}`,
        },
      });
    }
  });
  return res;
}

function compute_micros() {
  const micros = defaultdict(0.0);
  const names = {};
  let total = 0.0;
  compute_nutrients().forEach((n) => {
    total += n.value;
    all_nutrients
      .find((v) => v.name === n.name)
      ?.nutrients.forEach((micro) => {
        micros[micro.abbr] += n.value * micro.pcnt;
        names[micro.abbr] = micro.name;
      });
  });

  return Object.keys(micros).map((m) => {
    return {
      name: m,
      value: micros[m],
      label: {
        formatter: "{b}",
      },
      tooltip: {
        formatter: `${names[m]}: <b>${_.round(micros[m] * 1000, 2)}mg (${_.round(micros[m] / total * 100.0, 2)}%)</b>`,
      },
    };
  });
}

const option = ref({
  backgroundColor: "transparent",
  title: {
    text: "Amounts to Mix",
    left: "center",
  },
  tooltip: {
    trigger: "item",
  },
  legend: {
    orient: "horizontal",
    left: "center",
    top: "bottom",
  },
  series: [
    {
      type: "pie",
      radius: ["40%", "90%"],
      data: computed(() => compute_nutrients(true)),
      label: {
        show: true,
        position: "inside",
        fontSize: 17,
        fontWeight: "bold",
      },
    },
  ],
});

const option_micros = ref({
  backgroundColor: "transparent",
  title: {
    text: "Nutrient Analysis",
    left: "center",
  },
  tooltip: {
    trigger: "item",
  },
  legend: {
    orient: "horizontal",
    type: "scroll",
    left: "center",
    top: "bottom",
  },
  series: [
    {
      type: "pie",
      radius: "75%",
      data: computed(() => compute_micros()),
    },
  ],
});
</script>

<template>
  <UContainer class="flex flex-col items-center justify-center gap-4 overflow-y-auto my-8 max-w-2xl">
    <h1 class="font-bold text-2xl text-(--ui-primary)">Nutrient Calculator</h1>

    <div class="flex flex-col w-full gap-4">
      <UCard variant="subtle">
        <UContainer class="flex flex-col gap-2 items-center justify-center">
          <UButtonGroup class="w-full">
            <UBadge label="Feed Chart" color="neutral" variant="subtle" size="xl" />
            <USelect
              v-model="chart"
              :items="Object.keys(all_charts)"
              class="w-full"
              arrow
              size="xl"
              @change="stage = default_stage()"
            />
          </UButtonGroup>
          <UTabs
            v-model="schedule"
            class="w-full"
            size="xl"
            :items="
              Object.keys(all_charts[chart]!.charts).map((k) => {
                return { label: _.capitalize(k), value: k };
              })
            "
            :content="false"
          />
          <UTabs
            v-model="stage"
            class="w-full"
            size="xl"
            :items="
              Object.keys(all_charts[chart]!.charts[schedule]!).map((k) => {
                return { label: _.capitalize(k), value: k };
              })
            "
            :ui="{
              label: 'text-xs sm:text-base text-wrap',
            }"
            :content="false"
          />

          <UButtonGroup class="w-full">
            <UBadge label="Target amount" color="neutral" variant="subtle" size="xl" />
            <UInputNumber v-model="target_amount" :min="0" :step="0.1" class="w-full" size="xl" />
            <USelect
              v-model="target_unit"
              :items="units"
              color="neutral"
              variant="subtle"
              arrow
              size="xl"
            />
          </UButtonGroup>
        </UContainer>
      </UCard>
      <UCard variant="subtle">
        <UContainer class="flex flex-col gap-2 items-center justify-center h-128">
          <v-chart :option="option" />
        </UContainer>
      </UCard>
      <UCard variant="subtle">
        <UContainer class="flex flex-col gap-2 items-center justify-center h-128">
          <v-chart :option="option_micros" />
        </UContainer>
      </UCard>
    </div>
  </UContainer>
</template>
