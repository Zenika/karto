package replicaset

import (
	"github.com/google/go-cmp/cmp"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"karto/testutils"
	"karto/types"
	"testing"
)

func TestAnalyze(t *testing.T) {
	type args struct {
		replicaSet *appsv1.ReplicaSet
		pods       []*corev1.Pod
	}
	tests := []struct {
		name                             string
		args                             args
		expectedReplicaSetWithTargetPods *types.ReplicaSet
	}{
		{
			name: "replicaSet name and namespace are propagated",
			args: args{
				replicaSet: testutils.NewReplicaSetBuilder().WithName("rs").WithNamespace("ns").Build(),
				pods:       []*corev1.Pod{},
			},
			expectedReplicaSetWithTargetPods: &types.ReplicaSet{
				Name:       "rs",
				Namespace:  "ns",
				TargetPods: []types.PodRef{},
			},
		},
		{
			name: "only pods referencing replicaSet as owner are detected as target",
			args: args{
				replicaSet: testutils.NewReplicaSetBuilder().WithUID("replicaset-uid").Build(),
				pods: []*corev1.Pod{
					testutils.NewPodBuilder().WithName("name1").WithOwnerUID("replicaset-uid").Build(),
					testutils.NewPodBuilder().WithName("name2").WithOwnerUID("other-uid").Build(),
				},
			},
			expectedReplicaSetWithTargetPods: &types.ReplicaSet{
				Namespace: "default",
				TargetPods: []types.PodRef{
					{Name: "name1", Namespace: "default"},
				},
			},
		},
		{
			name: "replicaSets with 0 desired replicas are ignored",
			args: args{
				replicaSet: testutils.NewReplicaSetBuilder().WithDesiredReplicas(0).Build(),
				pods:       []*corev1.Pod{},
			},
			expectedReplicaSetWithTargetPods: nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			analyzer := NewAnalyzer()
			replicaSetWithTargetPods := analyzer.Analyze(tt.args.replicaSet, tt.args.pods)
			if diff := cmp.Diff(tt.expectedReplicaSetWithTargetPods, replicaSetWithTargetPods); diff != "" {
				t.Errorf("Analyze() result mismatch (-want +got):\n%s", diff)
			}
		})
	}
}
