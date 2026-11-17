export const sortingGoTemplate = `package main

import (
	"fmt"
	"os"

	"usercode/codinlab"
)

type Observation struct {
	Length      int \`json:"length"\`
	Comparisons int \`json:"comparisons"\`
	Swaps       int \`json:"swaps"\`
}

type action struct {
	Type string \`json:"type"\`
	I    int    \`json:"i"\`
	J    int    \`json:"j"\`
}

func must[T any](value T, err error) T {
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	return value
}

// compare returns -1 if item i < item j, 0 if equal, 1 if greater.
func compare(env *codinlab.Env, i, j int) int {
	step := must(env.Act(action{Type: "compare", I: i, J: j}))
	var info struct {
		Result int \`json:"result"\`
	}
	must(0, step.DecodeInfo(&info))
	return info.Result
}

func swap(env *codinlab.Env, i, j int) {
	must(env.Act(action{Type: "swap", I: i, J: j}))
}

func main() {
	env := codinlab.Connect()
	var obs Observation
	must(0, env.Observe(&obs))
	env.Logf("Sorting %d items", obs.Length)

	// TODO: sort the collection using compare() and swap().
	if compare(env, 0, 1) > 0 {
		swap(env, 0, 1)
	}

	must(env.Act(action{Type: "finish"}))
}
`;
