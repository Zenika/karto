package pod

import (
	corev1 "k8s.io/api/core/v1"
	"karto/types"
)

func Analyze(pods []*corev1.Pod) []types.Pod {
	return toPods(pods)
}

func toPods(pods []*corev1.Pod) []types.Pod {
	result := make([]types.Pod, 0)
	for _, podIsolation := range pods {
		result = append(result, toPod(podIsolation))
	}
	return result
}

func toPod(pod *corev1.Pod) types.Pod {
	return types.Pod{
		Name:      pod.Name,
		Namespace: pod.Namespace,
		Labels:    pod.Labels,
	}
}
