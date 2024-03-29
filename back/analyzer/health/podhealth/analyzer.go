package podhealth

import (
	corev1 "k8s.io/api/core/v1"
	"karto/analyzer/shared"
	"karto/types"
)

type Analyzer interface {
	Analyze(pod *corev1.Pod) *types.PodHealth
}

type analyzerImpl struct{}

func NewAnalyzer() Analyzer {
	return analyzerImpl{}
}

func (analyzer analyzerImpl) Analyze(pod *corev1.Pod) *types.PodHealth {
	var containers, running, ready, withoutRestart int32
	for _, containerStatus := range pod.Status.ContainerStatuses {
		containers++
		if containerStatus.State.Running != nil {
			running++
		}
		if containerStatus.Ready {
			ready++
		}
		if containerStatus.RestartCount == 0 {
			withoutRestart++
		}
	}
	return &types.PodHealth{
		Pod:                      shared.ToPodRef(pod),
		Containers:               containers,
		ContainersRunning:        running,
		ContainersReady:          ready,
		ContainersWithoutRestart: withoutRestart,
	}
}
