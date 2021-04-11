package podhealth

import (
	"github.com/google/go-cmp/cmp"
	corev1 "k8s.io/api/core/v1"
	"karto/testutils"
	"karto/types"
	"testing"
)

func TestAnalyze(t *testing.T) {
	type args struct {
		pod *corev1.Pod
	}
	tests := []struct {
		name              string
		args              args
		expectedPodHealth *types.PodHealth
	}{
		{
			name: "pod health is the aggregation of its container statuses",
			args: args{
				pod: testutils.NewPodBuilder().WithName("pod1").
					WithContainerStatus(true, true, 0).
					WithContainerStatus(true, true, 0).
					Build(),
			},
			expectedPodHealth: &types.PodHealth{
				Pod:                      types.PodRef{Name: "pod1", Namespace: "default"},
				Containers:               2,
				ContainersRunning:        2,
				ContainersReady:          2,
				ContainersWithoutRestart: 2,
			},
		},
		{
			name: "only containers with a Running state are counted as running",
			args: args{
				pod: testutils.NewPodBuilder().WithName("pod1").
					WithContainerStatus(true, true, 0).
					WithContainerStatus(false, true, 0).
					Build(),
			},
			expectedPodHealth: &types.PodHealth{
				Pod:                      types.PodRef{Name: "pod1", Namespace: "default"},
				Containers:               2,
				ContainersRunning:        1,
				ContainersReady:          2,
				ContainersWithoutRestart: 2,
			},
		},
		{
			name: "only containers marked as ready are counted as ready",
			args: args{
				pod: testutils.NewPodBuilder().WithName("pod1").
					WithContainerStatus(true, false, 0).
					WithContainerStatus(true, true, 0).
					Build(),
			},
			expectedPodHealth: &types.PodHealth{
				Pod:                      types.PodRef{Name: "pod1", Namespace: "default"},
				Containers:               2,
				ContainersRunning:        2,
				ContainersReady:          1,
				ContainersWithoutRestart: 2,
			},
		},
		{
			name: "only containers with zero restarts are counted as without restarts",
			args: args{
				pod: testutils.NewPodBuilder().WithName("pod1").
					WithContainerStatus(true, true, 0).
					WithContainerStatus(true, true, 2).
					Build(),
			},
			expectedPodHealth: &types.PodHealth{
				Pod:                      types.PodRef{Name: "pod1", Namespace: "default"},
				Containers:               2,
				ContainersRunning:        2,
				ContainersReady:          2,
				ContainersWithoutRestart: 1,
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			analyzer := NewAnalyzer()
			podHealth := analyzer.Analyze(tt.args.pod)
			if diff := cmp.Diff(tt.expectedPodHealth, podHealth); diff != "" {
				t.Errorf("Analyze() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}
