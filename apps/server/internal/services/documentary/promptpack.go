package documentary

import "strings"

func SerializePromptPack(plans []VisualPlan) string {
	blocks := make([]string, 0, len(plans))
	for _, plan := range plans {
		prompt := strings.TrimSpace(plan.Prompt)
		if prompt == "" {
			continue
		}
		blocks = append(blocks, prompt)
	}
	return strings.Join(blocks, "\n\n")
}
