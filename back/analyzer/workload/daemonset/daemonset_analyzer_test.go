package daemonset

import (
	"github.com/google/go-cmp/cmp"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"karto/testutils"
	"karto/types"
	"testing"
)

func Test_Analyze(t *testing.T) {
	type args struct {
		daemonSet *appsv1.DaemonSet
		pods      []*corev1.Pod
	}
	tests := []struct {
		name                            string
		args                            args
		expectedDaemonSetWithTargetPods *types.DaemonSet
	}{
		{
			name: "daemonSet name and namespace are propagated",
			args: args{
				daemonSet: testutils.NewDaemonSetBuilder().WithName("rs").WithNamespace("ns").Build(),
				pods:      []*corev1.Pod{},
			},
			expectedDaemonSetWithTargetPods: &types.DaemonSet{
				Name:       "rs",
				Namespace:  "ns",
				TargetPods: []types.PodRef{},
			},
		},
		{
			name: "only pods referencing daemonSet as owner are detected as target",
			args: args{
				daemonSet: testutils.NewDaemonSetBuilder().WithUID("daemonset-uid").Build(),
				pods: []*corev1.Pod{
					testutils.NewPodBuilder().WithName("name1").WithOwnerUID("daemonset-uid").Build(),
					testutils.NewPodBuilder().WithName("name2").WithOwnerUID("other-uid").Build(),
				},
			},
			expectedDaemonSetWithTargetPods: &types.DaemonSet{
				Namespace: "default",
				TargetPods: []types.PodRef{
					{Name: "name1", Namespace: "default"},
				},
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			analyzer := NewAnalyzer()
			daemonSetWithTargetPods := analyzer.Analyze(tt.args.daemonSet, tt.args.pods)
			if diff := cmp.Diff(tt.expectedDaemonSetWithTargetPods, daemonSetWithTargetPods); diff != "" {
				t.Errorf("Analyze() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}
